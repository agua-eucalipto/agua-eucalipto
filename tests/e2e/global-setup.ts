import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { raizEvidencia } from "./destino";

/** Deja la carpeta de evidencia lista para esta corrida. */
export default function prepararEvidencia(): void {
  const raiz = raizEvidencia();
  rmSync(join(raiz, "capturas"), { recursive: true, force: true });
  mkdirSync(join(raiz, "capturas"), { recursive: true });
  mkdirSync(raiz, { recursive: true });
  for (const nombre of readdirSync(raiz)) {
    if (nombre.startsWith("mediciones") && nombre.endsWith(".json")) {
      rmSync(join(raiz, nombre));
    }
  }
}
