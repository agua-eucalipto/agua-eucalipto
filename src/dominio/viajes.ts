import type { AnotacionOrdenable, EstadoViaje, ViajeTiempos } from "./tipos";

/** `anotadasActivas` cuenta solo las anotaciones en estado "anotada". */
export function estadoViaje(
  viaje: ViajeTiempos,
  anotadasActivas: number,
): EstadoViaje {
  if (viaje.cerrado_sin_completar_at !== null) {
    return "cerrado";
  }
  if (viaje.paso_at !== null) {
    return "ya_paso";
  }
  if (viaje.pedido_at !== null) {
    return "pedida";
  }
  return anotadasActivas >= viaje.minimo_casas ? "lista" : "juntando";
}

/**
 * Orden de la lista de un viaje: con prioridad primero, luego la más antigua esperando,
 * y en empate la que se anotó antes. Solo cuentan las anotaciones en estado "anotada".
 */
export function ordenarAnotaciones<T extends AnotacionOrdenable>(
  anotaciones: readonly T[],
): T[] {
  return anotaciones
    .filter((anotacion) => anotacion.estado === "anotada")
    .sort(
      (a, b) =>
        Number(b.con_prioridad) - Number(a.con_prioridad) ||
        a.antiguedad_desde - b.antiguedad_desde ||
        a.anotada_at - b.anotada_at,
    );
}
