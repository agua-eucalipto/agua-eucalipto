import { LONGITUD_TELEFONO } from "./reglas";

/**
 * Deja solo los 10 dígitos del número. Acepta la lada de México (+52 o +521) y cualquier
 * separador. Devuelve `null` si no resultan exactamente 10 dígitos.
 */
export function normalizarTelefono(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  let local = digitos;
  if (digitos.length === LONGITUD_TELEFONO + 3 && digitos.startsWith("521")) {
    local = digitos.slice(3);
  } else if (
    digitos.length === LONGITUD_TELEFONO + 2 &&
    digitos.startsWith("52")
  ) {
    local = digitos.slice(2);
  }
  return local.length === LONGITUD_TELEFONO ? local : null;
}
