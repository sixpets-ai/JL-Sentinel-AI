// Compatibility boundary: callers keep their contracts; Node never starts Python.
type ComputeKind = "quantum" | "heatmap";
export class ComputeServiceError extends Error { readonly status = 503; }
const circuits: Record<ComputeKind, { failures: number; openUntil: number }> = {
  quantum: { failures: 0, openUntil: 0 }, heatmap: { failures: 0, openUntil: 0 },
};
export async function computeRequest(kind: ComputeKind, endpoint: string, input?: unknown): Promise<unknown> {
  const circuit = circuits[kind];
  if (circuit.openUntil > Date.now()) throw new ComputeServiceError(`Servicio ${kind} temporalmente aislado; reintenta en unos segundos.`);
  const base = process.env[kind === "quantum" ? "QUANTUM_SERVICE_URL" : "HEATMAP_SERVICE_URL"]
    ?? `http://127.0.0.1:${kind === "quantum" ? 8099 : 8008}`;
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))) {
    throw new Error("Unsafe compute service URL.");
  }
  url.pathname = endpoint;
  try {
    const response = await fetch(url, {
      method: input === undefined ? "GET" : "POST",
      ...(input === undefined ? {} : { body: JSON.stringify(input), headers: { "Content-Type": "application/json" } }),
      signal: AbortSignal.timeout(5000), redirect: "error",
    });
    if (!response.ok) throw new Error(`Compute service HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Compute service empty response.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 100000) throw new Error("Compute output limit exceeded.");
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    circuit.failures = 0; circuit.openUntil = 0;
    return result;
  } catch {
    if (++circuit.failures >= 3) circuit.openUntil = Date.now() + 15000;
    throw new ComputeServiceError(`Servicio ${kind} no disponible. El resto del sistema permanece independiente; no se inventó un resultado.`);
  }
}
export function runPythonJson(scriptName: "quantum_engine.py" | "heatmap_generator.py", args: string[], input?: unknown): Promise<unknown> {
  if (scriptName === "heatmap_generator.py") {
    return computeRequest("heatmap", input === undefined ? "/scenario" : "/heatmap",
      input === undefined ? undefined : { events: input });
  }
  return computeRequest("quantum", "/optimize", {
    ...(input as { points: unknown[] }), mode: args.includes("--simulate-quantum") ? "quantum_demo" : "classical",
  });
}
