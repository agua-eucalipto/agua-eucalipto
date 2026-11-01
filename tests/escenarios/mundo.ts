import type { Api, ApiDemo } from "../../src/api/contrato";

/**
 * Datos mínimos con los que debe arrancar cada escenario, sea cual sea la
 * implementación de la `Api`: un catálogo chico, una lista blanca y un
 * coordinador. Sin folios, viajes ni espera, y sin sesión abierta.
 */
export interface Mundo {
  calle: string;
  /** Calles del coto: una casa de otra calle se rechaza (`CASA_OTRA_CALLE`). */
  calles_del_coto: readonly string[];
  /** Calles fuera del coto que se aceptan como solicitud de excepción. */
  calles_de_excepcion: readonly string[];
  casas: readonly string[];
  /** Teléfonos de la lista blanca (10 dígitos). */
  lista_blanca: readonly string[];
  /** Subconjunto de la lista blanca con rol de coordinador. */
  coordinadores: readonly string[];
}

export const CALLE = "Eucalipto";
/** Calle del coto distinta de Eucalipto: sin excepción se rechaza al instante. */
export const CALLE_OTRA = "Ciruelo";
/** Calle que se acepta como solicitud de excepción. */
export const CALLE_EXCEPCION = "Naranjo";
export const CASAS: readonly string[] = Array.from({ length: 25 }, (_, i) =>
  String(i + 1),
);
export const PIN = "1234";

/** Teléfono ficticio de la casa `casa`: `55 0000 00NN`. */
export function telefonoDe(casa: string): string {
  return `55000000${casa.padStart(2, "0")}`;
}

/** La casa 3 es la del coordinador; los vecinos de los escenarios no la usan. */
export const COORDINADOR = { casa: "3", telefono: telefonoDe("3") } as const;
export const TELEFONO_FUERA_DE_LISTA = "5500000090";
export const TELEFONO_DESCONOCIDO = "5500000077";

export const MUNDO: Mundo = {
  calle: CALLE,
  calles_del_coto: [CALLE, CALLE_OTRA],
  calles_de_excepcion: [CALLE_EXCEPCION],
  casas: CASAS,
  lista_blanca: CASAS.map(telefonoDe),
  coordinadores: [COORDINADOR.telefono],
};

export const METODOS_API = [
  "sesion_actual",
  "ingresar",
  "solicitar_acceso",
  "listar_folios_casa",
  "registrar_folio",
  "marcar_sigue_pendiente",
  "marcar_surtido",
  "marcar_sin_surtir",
  "listar_viajes",
  "listar_espera",
  "abrir_viaje",
  "editar_viaje",
  "anotarse",
  "anotarse_cualquiera",
  "dar_de_baja",
  "marcar_pedida",
  "marcar_ya_paso",
  "confirmar_entrega",
  "tomar_responsabilidad",
  "cancelar_viaje",
  "salir_de_espera",
  "generar_lista_caseta",
  "listar_solicitudes",
  "resolver_solicitud",
  "listar_telefonos",
  "reiniciar_telefono",
  "bitacora",
] as const satisfies readonly (keyof Api)[];

export const METODOS_DEMO = [
  "demo_ver_como",
  "demo_adelantar_reloj",
  "demo_reiniciar",
] as const satisfies readonly (keyof ApiDemo)[];

/** Falla al compilar si el contrato gana un método que la lista no conoce. */
export const LISTA_COMPLETA: Exclude<
  keyof Api,
  (typeof METODOS_API)[number]
> extends never
  ? true
  : never = true;
