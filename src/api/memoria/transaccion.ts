import type {
  CodigoError,
  Resultado,
  RolEvento,
  TipoEvento,
} from "../contrato";
import type { EstadoDemo, Evento } from "./estado";

export function exito<T>(datos: T): Resultado<T> {
  return { ok: true, datos };
}

export function falla(error: CodigoError, detalle?: string): Resultado<never> {
  return detalle === undefined
    ? { ok: false, error }
    : { ok: false, error, detalle };
}

/**
 * Una operación en curso: el estado sobre el que trabaja, el instante fijo de
 * la operación y la forma de dejar eventos en la bitácora.
 */
export class Transaccion {
  readonly estado: EstadoDemo;
  readonly ahora: number;

  constructor(estado: EstadoDemo, ahora: number) {
    this.estado = estado;
    this.ahora = ahora;
  }

  /** Casa de la sesión si es de vecino o de coordinador; `null` si no hay. */
  casa(): string | null {
    const { rol, casa } = this.estado.sesion;
    return rol === "vecino" || rol === "coordinador" ? casa : null;
  }

  esCoordinador(): boolean {
    return this.estado.sesion.rol === "coordinador";
  }

  /** Identificador nuevo con forma de uuid, determinista y sin teléfonos. */
  nuevoId(): string {
    const n = this.estado.siguiente_id;
    this.estado.siguiente_id += 1;
    return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
  }

  /** Evento a nombre de la sesión: su casa y su rol. */
  evento(tipo: TipoEvento, detalle: Evento["detalle"] = {}): void {
    const rol: RolEvento = this.esCoordinador() ? "coordinador" : "vecino";
    this.#agregar(tipo, detalle, rol, this.estado.sesion.casa);
  }

  /** Evento del sistema (el barrido): sin casa. */
  eventoSistema(tipo: TipoEvento, detalle: Evento["detalle"] = {}): void {
    this.#agregar(tipo, detalle, "sistema", null);
  }

  #agregar(
    tipo: TipoEvento,
    detalle: Evento["detalle"],
    rol: RolEvento,
    casa: string | null,
  ): void {
    this.estado.eventos.push({
      id: this.estado.siguiente_evento_id,
      ocurrido_at: this.ahora,
      casa_numero: casa,
      rol,
      tipo,
      detalle,
    });
    this.estado.siguiente_evento_id += 1;
  }
}
