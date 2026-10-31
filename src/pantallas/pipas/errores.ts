import type { CodigoError } from "../../api";
import { textos } from "../../textos";

const { pipas } = textos;

/** Texto amable para un código de error de regla; el de la `Api` manda. */
export function textoDeError(codigo: CodigoError): string {
  const catalogo: Record<string, string> = pipas.errores;
  return catalogo[codigo] ?? pipas.errores.inesperado;
}
