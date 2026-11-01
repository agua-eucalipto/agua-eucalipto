import {
  ordenCasa,
  type MarcaEvidencia,
  type NivelAljibe,
} from "../../dominio";
import type {
  Canal,
  CierreFolio,
  EstadoAnotacion,
  FormatoCaseta,
  OrigenEspera,
  RolEvento,
  RolSesion,
  SolicitudAcceso,
  TipoEvento,
} from "../contrato";

/**
 * Estado completo del demo. Cada tabla es un arreglo con los mismos campos
 * que el modelo de datos; los estados que dependen del tiempo no se guardan,
 * se derivan al leer.
 */

/** Sube cuando cambia la forma del estado guardado; los datos viejos se descartan. */
export const VERSION_ESTADO = 1;

export interface Casa {
  numero: string;
  calle: string;
  /** Para ordenar numéricamente ("2" antes que "10"). */
  orden: number;
  es_excepcion: boolean;
  creada_at: number;
}

export interface Telefono {
  numero: string;
  casa_numero: string | null;
  en_lista_blanca: boolean;
  /** En el demo no se guarda ningún PIN real: solo una marca de que ya se creó. */
  pin_hash: string | null;
  es_coordinador: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: number | null;
  reiniciado_at: number | null;
}

export interface Folio {
  id: string;
  codigo: string;
  canal: Canal;
  casa_numero: string;
  /** Teléfono de quien lo registró; solo lo ven los coordinadores. */
  registrado_por: string | null;
  registrado_at: number;
  extendido_at: number | null;
  cierre: CierreFolio | null;
  cerrado_at: number | null;
  reemplazado_por: string | null;
}

export interface Viaje {
  id: string;
  proveedor: string;
  precio_por_casa: number | null;
  minimo_casas: number;
  capacidad_aprox: number | null;
  responsable_casa: string;
  abierto_at: number;
  pedido_at: number | null;
  eta_texto: string | null;
  paso_at: number | null;
  cerrado_sin_completar_at: number | null;
  ultima_actividad_responsable_at: number;
}

export interface Anotacion {
  id: string;
  viaje_id: string;
  casa_numero: string;
  antiguedad_desde: number;
  con_prioridad: boolean;
  anotada_at: number;
  estado: EstadoAnotacion;
  estado_at: number;
}

export interface Espera {
  casa_numero: string;
  antiguedad_desde: number;
  con_prioridad: boolean;
  origen: OrigenEspera;
  creada_at: number;
}

export interface EnvioCaseta {
  id: string;
  creado_at: number;
  creado_por: string | null;
  columnas: ("canal" | "dias")[];
  formato: FormatoCaseta;
}

export interface EnvioCasetaFolio {
  envio_id: string;
  folio_id: string;
}

export interface Evento {
  id: number;
  ocurrido_at: number;
  casa_numero: string | null;
  rol: RolEvento;
  tipo: TipoEvento;
  detalle: Record<string, string | number | boolean | null>;
}

/** Último nivel reportado por una casa. La foto no se guarda aquí. */
export interface ReporteAljibeGuardado {
  id: string;
  casa_numero: string;
  nivel: NivelAljibe;
  reportado_at: number;
  marcas: MarcaEvidencia[];
  camara: string | null;
}

/** Sesión simulada del celular. El teléfono nunca sale de la `Api`. */
export interface SesionDemo {
  telefono: string | null;
  casa: string | null;
  rol: RolSesion;
}

export interface EstadoDemo {
  version: typeof VERSION_ESTADO;
  /** Calle de la lista ("Eucalipto"). */
  calle: string;
  /** Calles del coto, incluida la principal. */
  calles_del_coto: string[];
  casas: Casa[];
  telefonos: Telefono[];
  folios: Folio[];
  viajes: Viaje[];
  anotaciones: Anotacion[];
  espera: Espera[];
  solicitudes: SolicitudAcceso[];
  envios_caseta: EnvioCaseta[];
  envios_caseta_folios: EnvioCasetaFolio[];
  eventos: Evento[];
  sesion: SesionDemo;
  siguiente_id: number;
  siguiente_evento_id: number;
  /** Lo que se ha adelantado el reloj con `demo_adelantar_reloj`; se reaplica al recargar. */
  desfase_reloj_ms: number;
  /** Casilla del menú Demo. Apagada al empezar y al reiniciar. */
  mostrar_aljibe: boolean;
  /** Un reporte por casa: el más reciente. */
  reportes_aljibe: ReporteAljibeGuardado[];
  /** Huellas SHA-256 ya usadas, de cualquier casa. */
  huellas_foto: string[];
}

/** Datos con los que arranca el demo: catálogo, lista blanca y coordinadores. */
export interface Catalogo {
  calle: string;
  calles_del_coto: readonly string[];
  casas: readonly string[];
  /** Teléfonos de 10 dígitos. */
  lista_blanca: readonly string[];
  /** Subconjunto de la lista blanca. */
  coordinadores: readonly string[];
}

const CASAS_DEMO = Array.from({ length: 25 }, (_, i) => String(i + 1));

/** Catálogo ficticio por omisión: Eucalipto 1 a 25 con teléfonos `55 0000 00NN`. */
export const CATALOGO_DEMO: Catalogo = {
  calle: "Eucalipto",
  calles_del_coto: ["Eucalipto", "Ciruelo"],
  casas: CASAS_DEMO,
  lista_blanca: CASAS_DEMO.map((casa) => `55000000${casa.padStart(2, "0")}`),
  coordinadores: ["5500000003", "5500000018"],
};

export function ordenDeCasa(numero: string): number {
  return ordenCasa(numero) ?? Number.MAX_SAFE_INTEGER;
}

export function sinSesion(): SesionDemo {
  return { telefono: null, casa: null, rol: "sin_sesion" };
}

/** Estado sin folios, viajes ni espera, y sin sesión. */
export function crearEstadoInicial(
  catalogo: Catalogo,
  ahora: number,
): EstadoDemo {
  return {
    version: VERSION_ESTADO,
    calle: catalogo.calle,
    calles_del_coto: [...catalogo.calles_del_coto],
    casas: catalogo.casas.map((numero) => ({
      numero,
      calle: catalogo.calle,
      orden: ordenDeCasa(numero),
      es_excepcion: false,
      creada_at: ahora,
    })),
    telefonos: catalogo.lista_blanca.map((numero) => ({
      numero,
      casa_numero: null,
      en_lista_blanca: true,
      pin_hash: null,
      es_coordinador: catalogo.coordinadores.includes(numero),
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      reiniciado_at: null,
    })),
    folios: [],
    viajes: [],
    anotaciones: [],
    espera: [],
    solicitudes: [],
    envios_caseta: [],
    envios_caseta_folios: [],
    eventos: [],
    sesion: sinSesion(),
    siguiente_id: 1,
    siguiente_evento_id: 1,
    desfase_reloj_ms: 0,
    mostrar_aljibe: false,
    reportes_aljibe: [],
    huellas_foto: [],
  };
}

/**
 * Rellena los campos del aljibe si el estado guardado es de antes de esa
 * función. No cambia la versión: así el demo que ya estaba abierto sigue.
 */
export function completarEstado(estado: EstadoDemo): EstadoDemo {
  if (typeof estado.mostrar_aljibe !== "boolean") {
    estado.mostrar_aljibe = false;
  }
  if (!Array.isArray(estado.reportes_aljibe)) {
    estado.reportes_aljibe = [];
  }
  if (!Array.isArray(estado.huellas_foto)) {
    estado.huellas_foto = [];
  }
  return estado;
}
