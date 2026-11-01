import { api } from "../../app/servicios";

/**
 * Casas de la calle del demo (Eucalipto 1 a 25, como la semilla). La `Api` aún
 * no expone el catálogo: si algún día trae `listar_casas`, se usa; si no, esta
 * lista. Ver el parche propuesto en el retorno.
 */
export const CASAS_DEMO: readonly string[] = Array.from(
  { length: 25 },
  (_, i) => String(i + 1),
);

interface ConCatalogo {
  listar_casas?: () => Promise<
    { ok: true; datos: string[] } | { ok: false; error: string }
  >;
}

export async function cargarCasas(): Promise<readonly string[]> {
  const candidata = (api as unknown as ConCatalogo).listar_casas;
  if (typeof candidata === "function") {
    const r = await candidata.call(api);
    if (r.ok && r.datos.length > 0) return r.datos;
  }
  return CASAS_DEMO;
}
