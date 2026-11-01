import { join } from "node:path";

/** Carpeta de evidencia de esta corrida. Por defecto queda fuera de Git. */
export function raizEvidencia(): string {
  return (
    process.env.AUDITORIA_DIR ?? join(process.cwd(), "tests/e2e/artefactos")
  );
}
