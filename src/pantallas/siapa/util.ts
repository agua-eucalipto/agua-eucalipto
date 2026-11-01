import type { Canal, FolioVista } from "../../api";
import type { EstadoVisual } from "../../componentes";
import { normalizarFolio, PATRON_FOLIO_AYUNTAMIENTO } from "../../dominio";

/**
 * Canal según lo escrito. El prefijo se muestra antes de completar el folio;
 * 4 dígitos exactos son Ayuntamiento. La `Api` decide si el folio vale.
 */
export function canalEscrito(texto: string): Canal | null {
  const n = normalizarFolio(texto);
  if (n.startsWith("SIAPAZAP")) return "whatsapp";
  if (PATRON_FOLIO_AYUNTAMIENTO.test(n)) return "ayuntamiento";
  if (n.startsWith("1162")) return "telefono";
  return null;
}

export function insigniaDe(f: FolioVista): EstadoVisual {
  if (f.estado === "activo") return f.vence_hoy ? "vence-hoy" : "activo";
  if (f.estado === "vencido") return "vencio";
  if (f.estado === "cerrado_sin_surtir") return "cerrado";
  return f.estado;
}

export const esHistorial = (f: FolioVista) =>
  f.estado === "surtido" ||
  f.estado === "reemplazado" ||
  f.estado === "cerrado_sin_surtir";

/** Solo orden de lectura: lo que vence antes va primero. */
export const porVencimiento = (a: FolioVista, b: FolioVista) =>
  a.vence_at - b.vence_at;
