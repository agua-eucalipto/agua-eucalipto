import { ApiFalsa } from "../../src/api";
import * as relojReal from "../../src/reloj";
import type { Api, ApiDemo } from "../../src/api/contrato";
import { COORDINADOR } from "./mundo";

/** Funciones opcionales que no toda implementación tiene. */
export type Capacidad = "pin_verificado";

export interface Reloj {
  /** Instante actual de la implementación bajo prueba (ms desde epoch). */
  ahora(): number;
  adelantar(ms: number): Promise<void>;
}

/** Quién usa la `Api`: el número de una casa o `"coordinador"`. */
export type Quien = string;

export interface EntornoPrueba {
  api: Api;
  reloj: Reloj;
  /** Cambia la sesión de `api` a una casa de vecino o al coordinador. */
  entrarComo(quien: Quien): Promise<void>;
  capacidades: ReadonlySet<Capacidad>;
  cerrar?(): Promise<void> | void;
}

export const INICIO = Date.UTC(2026, 10, 2, 16, 0, 0);

/**
 * Única pieza que conoce la implementación bajo prueba. Para probar otra
 * (adaptador en memoria, Supabase) solo cambia este archivo: debe arrancar
 * con el `MUNDO` de `mundo.ts` y sin sesión.
 */
export async function crearApi(): Promise<EntornoPrueba> {
  const api: Api & ApiDemo = new ApiFalsa();
  relojReal.fijar(INICIO);
  return {
    api,
    reloj: {
      ahora: () => relojReal.ahora(),
      adelantar: async (ms) => {
        relojReal.adelantar(ms);
      },
    },
    entrarComo: async (quien) => {
      if (quien === "coordinador") {
        await api.demo_ver_como("coordinador", COORDINADOR.casa);
      } else {
        await api.demo_ver_como("vecino", quien);
      }
    },
    capacidades: new Set<Capacidad>(),
    cerrar: () => relojReal.reiniciar(),
  };
}
