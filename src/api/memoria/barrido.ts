import { CIERRE_VIAJE_MS } from "../../dominio";
import type { Transaccion } from "./transaccion";
import { cerrarSinCompletar } from "./viajes";

/**
 * Corre antes de cada operación, lectura o escritura (G-INV-4). Solo cierra
 * los viajes que llevan 72 h abiertos sin "ya pasó" (P-11); lo demás que
 * depende del tiempo se deriva al leer. Es idempotente: un viaje cerrado ya
 * no vuelve a cumplir la condición. Devuelve cuántos viajes cerró.
 */
export function barrer(tx: Transaccion): number {
  const vencidos = tx.estado.viajes
    .filter(
      (v) =>
        v.paso_at === null &&
        v.cerrado_sin_completar_at === null &&
        tx.ahora >= v.abierto_at + CIERRE_VIAJE_MS,
    )
    .sort((a, b) => a.abierto_at - b.abierto_at);
  for (const viaje of vencidos) {
    const movidas = cerrarSinCompletar(tx, viaje);
    tx.eventoSistema("viaje_cerrado_72h", {
      viaje_id: viaje.id,
      casas_a_espera: movidas,
    });
  }
  return vencidos.length;
}
