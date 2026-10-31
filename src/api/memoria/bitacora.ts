import type { EventoVista, Resultado } from "../contrato";
import { Transaccion, exito, falla } from "./transaccion";
import { eventoVista } from "./vistas";

const LIMITE_BITACORA = 50;

/** Bitácora pública, del más reciente al más antiguo, por páginas. */
export function bitacora(
  tx: Transaccion,
  antesDeId?: number,
  limite = LIMITE_BITACORA,
): Resultado<EventoVista[]> {
  if (tx.casa() === null) {
    return falla("NO_AUTORIZADO");
  }
  const cuantos = Number.isFinite(limite)
    ? Math.max(1, Math.floor(limite))
    : LIMITE_BITACORA;
  const eventos: EventoVista[] = [];
  for (let i = tx.estado.eventos.length - 1; i >= 0; i -= 1) {
    const evento = tx.estado.eventos[i];
    if (evento === undefined) {
      continue;
    }
    if (antesDeId !== undefined && evento.id >= antesDeId) {
      continue;
    }
    eventos.push(eventoVista(evento));
    if (eventos.length >= cuantos) {
      break;
    }
  }
  return exito(eventos);
}
