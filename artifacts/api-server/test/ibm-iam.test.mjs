import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";

// Fully isolated fixture: these tests never call IBM and never read a real key.
process.env.IBM_API_KEY = "unit-test-fixture-not-a-real-key";
const compiled = await build({
  entryPoints: [path.resolve("src/lib/global/ibm-iam.ts")],
  bundle: true, write: false, format: "cjs", platform: "node", packages: "external", logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url), module, module.exports,
);
const { ibmAuthenticatedFetch, getIbmIamToken } = module.exports;
const originalFetch = globalThis.fetch;
const iamReply = n => Response.json({ access_token: `fixture-token-${n}`, expires_in: 3600 });

test("fresh IAM token for every outbound operation and once-only refresh on 401", async () => {
  let exchanges = 0, calls = 0;
  const authorizations = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("iam.cloud.ibm.com/identity/token")) return iamReply(++exchanges);
    calls++;
    authorizations.push(new Headers(init.headers).get("Authorization"));
    return new Response("", { status: calls === 1 ? 401 : 200 });
  };
  try {
    assert.equal((await ibmAuthenticatedFetch(new URL("https://api.aiopenscale.cloud.ibm.com/v2/monitor_instances/test"))).status, 200);
    assert.equal(exchanges, 2);
    assert.notEqual(authorizations[0], authorizations[1]);
    await ibmAuthenticatedFetch(new URL("https://quantum.cloud.ibm.com/api/v1/test"));
    assert.equal(exchanges, 3, "Quantum REST uses the same fresh-token transport");
  } finally { globalThis.fetch = originalFetch; }
});
test("404 is not retried or presented as successful authentication repair", async () => {
  let calls = 0;
  globalThis.fetch = async url => {
    if (String(url).includes("iam.cloud.ibm.com/identity/token")) return iamReply(1);
    calls++;
    return new Response("", { status: 404 });
  };
  try {
    assert.equal((await ibmAuthenticatedFetch(new URL("https://api.aiopenscale.cloud.ibm.com/v2/missing"))).status, 404);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});
test("concurrent IAM calls share one exchange; rejected IAM is explicit; redirects cannot leak credentials", async () => {
  let count = 0;
  globalThis.fetch = async () => { count++; return iamReply(1); };
  try {
    const tokens = await Promise.all([getIbmIamToken(), getIbmIamToken(), getIbmIamToken()]);
    assert.equal(count, 1);
    assert.equal(new Set(tokens).size, 1);
    await assert.rejects(ibmAuthenticatedFetch(new URL("https://attacker.invalid/")), /no permitido/);
    globalThis.fetch = async () => new Response("", { status: 403 });
    await assert.rejects(getIbmIamToken(), /IAM HTTP 403/);
  } finally { globalThis.fetch = originalFetch; }
});
