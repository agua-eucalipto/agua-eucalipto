import {
  AVISO_VENCE_HOY_MS,
  DIA_MS,
  PATRON_FOLIO_TELEFONO,
  PATRON_FOLIO_WHATSAPP,
  VIGENCIA_FOLIO_MS,
  VIGENCIA_MAXIMA_FOLIO_MS,
} from "./reglas";
import type { Canal, EstadoFolio, FolioTiempos } from "./tipos";

/** Mayúsculas y sin espacios, guiones ni puntos. */
export function normalizarFolio(codigo: string): string {
  return codigo.replace(/[\s.\-–—]/g, "").toUpperCase();
}

/** Devuelve el código normalizado y su canal, o `null` si no tiene un formato válido. */
export function clasificarFolio(
  codigo: string,
): { codigo: string; canal: Canal } | null {
  const normalizado = normalizarFolio(codigo);
  if (PATRON_FOLIO_WHATSAPP.test(normalizado)) {
    return { codigo: normalizado, canal: "whatsapp" };
  }
  if (PATRON_FOLIO_TELEFONO.test(normalizado)) {
    return { codigo: normalizado, canal: "telefono" };
  }
  return null;
}

/** Instante en que vence el folio: 3 días desde el registro, o 6 si se extendió. */
export function venceAt(
  folio: Pick<FolioTiempos, "registrado_at" | "extendido_at">,
): number {
  const vigencia =
    folio.extendido_at === null ? VIGENCIA_FOLIO_MS : VIGENCIA_MAXIMA_FOLIO_MS;
  return folio.registrado_at + vigencia;
}

export function estadoFolio(folio: FolioTiempos, ahora: number): EstadoFolio {
  if (folio.cierre !== null) {
    return folio.cierre;
  }
  return ahora < venceAt(folio) ? "activo" : "vencido";
}

/** Bloques completos de 24 horas desde el registro. */
export function diasQueLleva(registradoAt: number, ahora: number): number {
  return Math.max(0, Math.floor((ahora - registradoAt) / DIA_MS));
}

/** "Sigue pendiente" se puede usar una vez, sin cierre y antes de cumplirse 6 días del registro. */
export function puedeExtender(folio: FolioTiempos, ahora: number): boolean {
  return (
    folio.extendido_at === null &&
    folio.cierre === null &&
    ahora < folio.registrado_at + VIGENCIA_MAXIMA_FOLIO_MS
  );
}

/** Activo y con menos de 24 horas de vigencia restante. */
export function venceHoy(folio: FolioTiempos, ahora: number): boolean {
  return (
    estadoFolio(folio, ahora) === "activo" &&
    venceAt(folio) - ahora < AVISO_VENCE_HOY_MS
  );
}
