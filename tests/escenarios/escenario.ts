import { it } from "vitest";
import type { Api } from "../../src/api/contrato";
import { crearApi, type Capacidad, type Quien, type Reloj } from "./fabrica";
import { MUNDO, type Mundo } from "./mundo";

export interface Contexto {
  api: Api;
  reloj: Reloj;
  /** Cambia quién usa la `Api`: una casa o `"coordinador"`. */
  como(quien: Quien): Promise<void>;
  mundo: Mundo;
}

export interface OpcionesEscenario {
  /** El escenario se omite si la implementación no declara la capacidad. */
  requiere?: Capacidad;
}

const INICIA_CON_ID = /^(?:[FCPA]-\d{2}|G-INV-\d)(?![\w-])/;

/**
 * Registra un escenario. El nombre empieza con el ID de la regla que prueba
 * (`F-03 · tope de 2 por canal`); si prueba varias, las demás van después.
 * Cada escenario recibe una `Api` nueva, sin datos y sin sesión.
 */
export function escenario(
  nombre: string,
  fn: (contexto: Contexto) => Promise<void>,
  opciones: OpcionesEscenario = {},
): void {
  if (!INICIA_CON_ID.test(nombre)) {
    throw new Error(
      `El escenario "${nombre}" debe empezar con el ID de una regla (F-03, P-07, G-INV-2…)`,
    );
  }
  it(nombre, async (ctx) => {
    const entorno = await crearApi();
    try {
      if (
        opciones.requiere !== undefined &&
        !entorno.capacidades.has(opciones.requiere)
      ) {
        ctx.skip(`la implementación no declara «${opciones.requiere}»`);
      }
      await fn({
        api: entorno.api,
        reloj: entorno.reloj,
        como: (quien) => entorno.entrarComo(quien),
        mundo: MUNDO,
      });
    } finally {
      await entorno.cerrar?.();
    }
  });
}
