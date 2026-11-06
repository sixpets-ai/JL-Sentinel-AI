import { createHash } from "node:crypto";
import { db, incidentReports } from "@workspace/db";
import { desc } from "drizzle-orm";
import { z } from "zod";

export const TOPICS = ["earthquake", "flood", "wildfire", "humanitarian"] as const;
export type Topic = typeof TOPICS[number];
export type EventRecord = {
  id: string; title: string; source: string; url: string; observedAt: string;
  publishedAt: string | null; lat: number | null; lng: number | null;
  mentions: number; kind: "coverage" | "earthquake" | "local_demo" | "social";
};
type Source = { name: string; status: "live" | "cached" | "unavailable" | "not_configured"; detail: string };
export type Snapshot = {
  topic: Topic; fetchedAt: string; cached: boolean; events: EventRecord[]; sources: Source[]; notice: string;
};
const NOTICE = "Cobertura pública no verificada: menciones y coordenadas aproximadas no prueban incidentes ni riesgo. Sin rastreo de personas, triangulación de dispositivos ni despacho de unidades. Los registros locales son demostraciones.";
const cache = new Map<Topic, { data: Snapshot; expires: number }>();
const pending = new Map<Topic, Promise<Snapshot>>();
let publicSourcesNextFetch = 0;
let latestPublic: { data: Snapshot; topic: Topic } | undefined;

export function safeUrl(value: unknown): string | null {
  try { const url = new URL(String(value)); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 20);
function gdeltObservedAt(raw: string | undefined, fallback: string): string {
  const match = raw?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return fallback;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
const pointFeature = z.object({
  geometry: z.object({ type: z.literal("Point"), coordinates: z.array(z.number()).min(2) }),
  properties: z.object({
    title: z.string().optional(), name: z.string().optional(), count: z.number().optional(),
    url: z.string().optional(), time: z.number().optional(), html: z.string().optional(),
  }).passthrough(),
}).passthrough();

export async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000), redirect: "error" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > 3_000_000) throw new Error("Respuesta demasiado grande.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Respuesta vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 3_000_000) throw new Error("Respuesta demasiado grande.");
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

async function collect(topic: Topic): Promise<Snapshot> {
  const fetchedAt = new Date().toISOString();
  const events: EventRecord[] = [];
  const sources: Source[] = [];
  await Promise.all([
    (async () => {
      try {
        const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
        url.search = new URLSearchParams({ query: topic, mode: "ArtList", format: "json", maxrecords: "30", timespan: "24h", sort: "DateDesc" }).toString();
        const parsed = z.object({ articles: z.array(z.object({
          title: z.string(), url: z.string(), seendate: z.string().optional(),
          domain: z.string().optional(),
        })) }).parse(await fetchJson(url.href));
        for (const article of parsed.articles.slice(0, 30)) {
          const link = safeUrl(article.url);
          if (!link) continue;
          events.push({ id: hash(link), title: article.title.slice(0, 500), source: `GDELT · ${article.domain ?? "prensa"}`,
            url: link, observedAt: gdeltObservedAt(article.seendate, fetchedAt), publishedAt: null,
            lat: null, lng: null, mentions: 1, kind: "coverage" });
        }
        sources.push({ name: "GDELT DOC", status: "live", detail: `${parsed.articles.length} referencias públicas. Sin coordenadas inferidas.` });
      } catch {
        sources.push({ name: "GDELT DOC", status: "unavailable", detail: "La API no respondió correctamente; no se inventaron noticias." });
      }
    })(),
    (async () => {
      if (topic !== "earthquake") return;
      try {
        const feed = z.object({ features: z.array(pointFeature) }).parse(await fetchJson(
          "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
        ));
        for (const feature of feed.features.slice(0, 100)) {
          const [lng, lat] = feature.geometry.coordinates;
          const link = safeUrl(feature.properties.url);
          if (!link || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
          events.push({ id: hash(link), title: feature.properties.title ?? "Sismo reportado por USGS",
            source: "USGS · fuente oficial", url: link, observedAt: fetchedAt,
            publishedAt: feature.properties.time ? new Date(feature.properties.time).toISOString() : null,
            lat, lng, mentions: 1, kind: "earthquake" });
        }
        sources.push({ name: "USGS", status: "live", detail: "Feed oficial de sismos M2.5+ de las últimas 24 horas; sujeto a revisión." });
      } catch { sources.push({ name: "USGS", status: "unavailable", detail: "Feed oficial temporalmente no disponible." }); }
    })(),
    (async () => {
      const key = process.env.NEWS_API_KEY;
      if (!key) { sources.push({ name: "NewsAPI", status: "not_configured", detail: "Requiere clave y plan con licencia para el uso previsto." }); return; }
      try {
        const url = new URL("https://newsapi.org/v2/everything");
        url.search = new URLSearchParams({ q: topic, pageSize: "20", sortBy: "publishedAt" }).toString();
        const parsed = z.object({ status: z.literal("ok"), articles: z.array(z.object({
          title: z.string().nullable(), url: z.string(), publishedAt: z.string(),
          source: z.object({ name: z.string() }),
        })) }).parse(await fetchJson(url.href, { "X-Api-Key": key }));
        for (const article of parsed.articles) {
          const link = safeUrl(article.url);
          if (link) events.push({ id: hash(link), title: article.title ?? "Titular no disponible",
            source: `NewsAPI · ${article.source.name}`, url: link, observedAt: fetchedAt,
            publishedAt: article.publishedAt, lat: null, lng: null, mentions: 1, kind: "coverage" });
        }
        sources.push({ name: "NewsAPI", status: "live", detail: "Metadatos y enlaces; no se descarga el texto de los artículos." });
      } catch { sources.push({ name: "NewsAPI", status: "unavailable", detail: "Fallo del proveedor; revisa plan, cuota y autorización." }); }
    })(),
    (async () => {
      const actor = process.env.BLUESKY_PUBLIC_ACTOR;
      if (!actor) { sources.push({ name: "Red social · Bluesky", status: "not_configured", detail: "Sin cuenta institucional pública configurada; no se rastrean usuarios." }); return; }
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(actor)) { sources.push({ name: "Red social · Bluesky", status: "unavailable", detail: "Identificador institucional inválido." }); return; }
      try {
        const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed");
        url.search = new URLSearchParams({ actor, limit: "10", filter: "posts_no_replies" }).toString();
        const feed = z.object({ feed: z.array(z.object({ post: z.object({
          uri: z.string(), record: z.object({ text: z.string(), createdAt: z.string() }),
        }) })) }).parse(await fetchJson(url.href));
        for (const { post } of feed.feed) {
          if (!post.record.text.toLowerCase().includes(topic)) continue;
          const rkey = post.uri.split("/").pop();
          if (!rkey || !/^[a-z0-9]+$/i.test(rkey)) continue;
          const url = `https://bsky.app/profile/${actor}/post/${rkey}`;
          events.push({ id: hash(url), title: post.record.text.slice(0, 500), source: `Bluesky · ${actor}`,
            url, observedAt: fetchedAt, publishedAt: post.record.createdAt, lat: null, lng: null, mentions: 1, kind: "social" });
        }
        sources.push({ name: "Red social · Bluesky", status: "live", detail: "API oficial; publicaciones públicas de la cuenta configurada, sin perfiles ni seguidores." });
      } catch { sources.push({ name: "Red social · Bluesky", status: "unavailable", detail: "API oficial no disponible." }); }
    })(),
  ]);
  // Local records remain explicitly demo-only; no public source corroborates them.
  try {
    const local = await db.select().from(incidentReports).orderBy(desc(incidentReports.createdAt)).limit(20);
    for (const row of local) events.push({
      id: `demo-${row.id}`, title: `${row.folio} · ${row.tipo} (demostración)`,
      source: "SANTI · datos locales de demostración", url: "/", observedAt: fetchedAt,
      publishedAt: row.createdAt.toISOString(), lat: row.latitud, lng: row.longitud, mentions: 1, kind: "local_demo",
    });
  } catch { sources.push({ name: "SANTI local", status: "unavailable", detail: "No se pudo leer la base de demostración." }); }
  return { topic, fetchedAt, cached: false, events: Array.from(new Map(events.map(e => [e.id, e])).values()), sources, notice: NOTICE };
}

export async function getSnapshot(topic: Topic): Promise<Snapshot> {
  const saved = cache.get(topic);
  if (saved && saved.expires > Date.now()) return {
    ...saved.data, cached: true,
    sources: saved.data.sources.map(s => s.status === "live" ? { ...s, status: "cached" } : s),
  };
  const ongoing = pending.get(topic);
  if (ongoing) return ongoing;
  // At most one upstream batch per 15 seconds across topics (single process).
  if (Date.now() < publicSourcesNextFetch && latestPublic?.topic !== topic) {
    return { topic, fetchedAt: new Date().toISOString(), cached: false, events: [], notice: NOTICE,
      sources: [{ name: "Consultas públicas", status: "unavailable", detail: "Espera 15 segundos antes de consultar otro tema; protección de cuota." }] };
  }
  publicSourcesNextFetch = Date.now() + 15000;
  const task = collect(topic).then(data => {
    const success = data.sources.some(s => s.status === "live");
    cache.set(topic, { data, expires: Date.now() + (success ? 300000 : 60000) });
    latestPublic = { data, topic };
    return data;
  }).finally(() => pending.delete(topic));
  pending.set(topic, task);
  return task;
}
