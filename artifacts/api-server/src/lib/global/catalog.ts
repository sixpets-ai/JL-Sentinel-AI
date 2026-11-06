import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GetCrimeCatalogResponse } from "@workspace/api-zod";

let cached: Promise<ReturnType<typeof GetCrimeCatalogResponse.parse>> | undefined;
export function getCrimeCatalog() {
  if (!cached) cached = (async () => {
    const file = [
      path.resolve("crime_catalog.json"), path.resolve("../../crime_catalog.json"),
      path.join(path.dirname(fileURLToPath(import.meta.url)), "crime_catalog.json"),
    ].find(existsSync);
    if (!file) throw new Error("Catálogo oficial de referencia no instalado.");
    return GetCrimeCatalogResponse.parse(JSON.parse(await readFile(file, "utf8")));
  })().catch(error => { cached = undefined; throw error; });
  return cached;
}
