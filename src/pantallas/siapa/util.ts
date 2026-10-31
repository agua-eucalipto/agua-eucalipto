import type { Canal, FolioVista } from "../../api";
import type { EstadoVisual } from "../../componentes";
import { normalizarFolio } from "../../dominio";

/** Canal según el comienzo de lo escrito; la `Api` decide si el folio vale. */
export function canalEscrito(texto: string): Canal | null {
  const n = normalizarFolio(texto);
  if (n.startsWith("SIAPAZAP")) return "whatsapp";
  if (n.startsWith("1162")) return "telefono";
  return null;
}

export function insigniaDe(f: FolioVista): EstadoVisual {
  if (f.estado === "activo") return f.vence_hoy ? "vence-hoy" : "activo";
  if (f.estado === "vencido") return "vencio";
  return f.estado;
}

export const esHistorial = (f: FolioVista) =>
  f.estado === "surtido" || f.estado === "reemplazado";

/** Solo orden de lectura: lo que vence antes va primero. */
export const porVencimiento = (a: FolioVista, b: FolioVista) =>
  a.vence_at - b.vence_at;
