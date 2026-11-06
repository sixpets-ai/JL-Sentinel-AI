import { z } from "zod";

let pending: Promise<string> | undefined;

/** A fresh IAM token per outbound operation; concurrent callers share one exchange.
 * No tokens or credentials are logged, returned to browsers, or stored on disk.
 */
export function getIbmIamToken(): Promise<string> {
  if (pending) return pending;
  pending = (async () => {
    if (!process.env.IBM_API_KEY) throw new Error("IBM_API_KEY no configurada.");
    const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: process.env.IBM_API_KEY,
      }),
    });
    if (!response.ok) throw new Error(`IBM IAM HTTP ${response.status}`);
    const token = z.object({ access_token: z.string().min(1), expires_in: z.number().positive().optional() })
      .parse(await response.json());
    return token.access_token;
  })().finally(() => { pending = undefined; });
  return pending;
}

/** Shared authenticated transport for Governance/Watsonx and future Quantum REST
 * clients. Demo Quantum routes are local and deliberately never call this.
 * Retry ONLY an authentication rejection, once. Do not retry arbitrary POSTs.
 */
export async function ibmAuthenticatedFetch(url: URL, init: RequestInit = {}): Promise<Response> {
  if (url.protocol !== "https:" || url.username || url.password ||
      !/^(?:[a-z0-9-]+\.)*cloud\.ibm\.com$/.test(url.hostname)) {
    throw new Error("Endpoint IBM HTTPS no permitido.");
  }
  const send = async () => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await getIbmIamToken()}`);
    return fetch(url, { ...init, headers, redirect: "error", signal: init.signal ?? AbortSignal.timeout(15000) });
  };
  const first = await send();
  if (first.status !== 401) return first;
  await first.body?.cancel();
  return send();
}
