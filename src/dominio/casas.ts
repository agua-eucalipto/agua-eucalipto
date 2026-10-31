const NUMERO_DE_CASA = /^(\d+)(?:-?([A-Za-z]))?$/;
const CODIGO_LETRA_A = 64;

/**
 * Valor entero para ordenar casas de forma numérica: "2" va antes que "10" y "12" antes que
 * "12-A". Devuelve `null` si el texto no es un número de casa.
 */
export function ordenCasa(numero: string): number | null {
  const partes = NUMERO_DE_CASA.exec(numero.trim());
  if (partes === null) {
    return null;
  }
  const letra = partes[2];
  const desplazamiento =
    letra === undefined
      ? 0
      : letra.toUpperCase().charCodeAt(0) - CODIGO_LETRA_A;
  return Number(partes[1]) * 100 + desplazamiento;
}
