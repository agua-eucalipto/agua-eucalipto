/**
 * Contrato de la API: la única frontera entre la interfaz y las reglas.
 *
 * - Toda función devuelve `Promise<Resultado<T>>`, aunque el adaptador sea
 *   síncrono. Un rechazo de regla es un `Resultado` con `ok: false`; las
 *   excepciones quedan para fallas reales (red, errores de programación).
 * - La sesión es implícita: ninguna función recibe "quién soy".
 * - El reloj nunca es parámetro: el adaptador conoce "ahora".
 * - Los nombres de los métodos son idénticos a las funciones remotas
 *   (`snake_case`), así un adaptador remoto solo tiene que reenviarlos.
 * - Instantes en milisegundos desde epoch (`number`).
 *
 * Privacidad: ningún tipo que reciba una sesión de vecino incluye teléfonos.
 * Los únicos tipos con teléfono son `TelefonoVista` y `SolicitudAcceso`, que
 * solo devuelven funciones de coordinador.
 */

// ---------------------------------------------------------------------------
// Resultado y códigos de error
// ---------------------------------------------------------------------------

/** Todos los códigos de error de regla que puede devolver la API. */
export const CODIGOS_ERROR = [
  // Sesión y acceso
  "TELEFONO_INVALIDO",
  "PIN_INVALIDO",
  "PIN_INCORRECTO",
  "CASA_NO_EXISTE",
  "CASA_OTRA_CALLE",
  "BLOQUEADO",
  // Folios
  "FOLIO_FORMATO_INVALIDO",
  "FOLIO_YA_USADO",
  "TOPE_CANAL",
  "REEMPLAZO_INVALIDO",
  "YA_EXTENDIDO",
  "FUERA_DE_PLAZO",
  "FOLIO_CERRADO",
  // Pipas
  "DATOS_INVALIDOS",
  "FALTA_ACEPTAR",
  "YA_EN_VIAJE",
  "NO_ES_RESPONSABLE",
  "VIAJE_CERRADO",
  "NO_ANOTADO",
  "ES_RESPONSABLE",
  "NO_ESTA_LISTA",
  "NO_ESTA_PEDIDA",
  "NO_HA_PASADO",
  "YA_CONFIRMADO",
  "RESPONSABLE_ACTIVO",
  "NO_EN_ESPERA",
  // Coordinador
  "NO_AUTORIZADO",
  "YA_RESUELTA",
  // Generales
  "NO_ENCONTRADO",
] as const;

export type CodigoError = (typeof CODIGOS_ERROR)[number];

export type Resultado<T> =
  { ok: true; datos: T } | { ok: false; error: CodigoError; detalle?: string };

// ---------------------------------------------------------------------------
// Valores comunes
// ---------------------------------------------------------------------------

export type Canal = "whatsapp" | "telefono";

export type CierreFolio = "surtido" | "reemplazado";

/** Estado de un folio: el cierre guardado o, si no hay, el derivado del tiempo. */
export type EstadoFolio = "activo" | "vencido" | CierreFolio;

export type EstadoViaje =
  "juntando" | "lista" | "pedida" | "ya_paso" | "cerrado";

export type EstadoAnotacion =
  | "anotada"
  | "baja"
  | "baja_despues_de_pedida"
  | "surtio"
  | "pendiente"
  | "movida_a_espera";

export type OrigenEspera = "pendiente" | "viaje_cerrado" | "me_da_igual";

export type RolSesion = "vecino" | "coordinador" | "pendiente" | "sin_sesion";

export type MotivoSolicitud =
  "telefono_fuera_de_lista" | "casa_fuera_de_catalogo";

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export type FormatoCaseta = "imprimir" | "whatsapp";

export type ResultadoEntrega = "surtio" | "pendiente";

export type PerfilDemo = "vecino" | "coordinador" | "otra_calle";

// ---------------------------------------------------------------------------
// Sesión y acceso
// ---------------------------------------------------------------------------

/** La sesión del celular. No lleva teléfono. */
export interface Sesion {
  /** Número de casa vinculado; `null` si aún no hay casa. */
  casa: string | null;
  rol: RolSesion;
}

/**
 * Solicitud de acceso completa, tal como la ve un coordinador. Incluye el
 * teléfono de quien la pidió y el de quien la resolvió.
 *
 * Solo la devuelven `listar_solicitudes` y `resolver_solicitud`.
 */
export interface SolicitudAcceso {
  id: string;
  telefono: string;
  /** Lo que escribió quien la pidió, p. ej. "Naranjo 8". */
  casa_texto: string;
  motivo: MotivoSolicitud;
  estado: EstadoSolicitud;
  creada_at: number;
  resuelta_at: number | null;
  /** Teléfono del coordinador que la resolvió. */
  resuelta_por: string | null;
}

/**
 * Lo que recibe quien envía una solicitud de acceso con `solicitar_acceso`.
 *
 * Es un tipo aparte de `SolicitudAcceso` a propósito: quien pide acceso no
 * necesita que se le devuelva ningún teléfono (ni el suyo ni, más adelante,
 * el del coordinador que resuelva), y la sesión que la envía puede terminar
 * siendo de vecino en el mismo celular. Así el tipo garantiza que esta
 * respuesta nunca lleva teléfonos, en lugar de depender de que un campo
 * venga vacío.
 */
export type SolicitudAccesoEnviada = Omit<
  SolicitudAcceso,
  "telefono" | "resuelta_por"
>;

// ---------------------------------------------------------------------------
// Folios
// ---------------------------------------------------------------------------

/**
 * Folio de la casa de la sesión, con sus derivados calculados al leer.
 * El código va completo porque es de la propia casa. No incluye quién lo
 * registró (ese dato es un teléfono).
 */
export interface FolioVista {
  id: string;
  /** Código normalizado y completo. */
  codigo: string;
  canal: Canal;
  casa_numero: string;
  registrado_at: number;
  extendido_at: number | null;
  cierre: CierreFolio | null;
  cerrado_at: number | null;
  reemplazado_por: string | null;
  // Derivados
  estado: EstadoFolio;
  vence_at: number;
  dias_que_lleva: number;
  puede_extender: boolean;
  /** Activo y con menos de 24 horas de vigencia restante. */
  vence_hoy: boolean;
  /** Fecha del último envío a caseta en que apareció; `null` si nunca. */
  ultimo_envio_caseta_at: number | null;
}

// ---------------------------------------------------------------------------
// Pipas
// ---------------------------------------------------------------------------

/** Una casa dentro de un viaje. Se identifica por número de casa. */
export interface AnotacionVista {
  id: string;
  casa_numero: string;
  antiguedad_desde: number;
  con_prioridad: boolean;
  anotada_at: number;
  estado: EstadoAnotacion;
  estado_at: number;
  // Derivados
  /** El viaje ya pasó, la casa no confirmó y venció el plazo para hacerlo. */
  sin_confirmar: boolean;
  /** La fila queda después de la capacidad aproximada del viaje. */
  excede_capacidad: boolean;
}

export interface ViajeVista {
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
  // Derivados
  estado: EstadoViaje;
  /** Casas con anotación `anotada`. */
  anotadas: number;
  /** Ya en el orden del viaje: prioridad, antigüedad y hora de anotación. */
  anotaciones: AnotacionVista[];
  puede_que_no_alcance: boolean;
  responsable_inactivo: boolean;
  soy_responsable: boolean;
  estoy_anotado: boolean;
}

export interface EsperaVista {
  casa_numero: string;
  antiguedad_desde: number;
  con_prioridad: boolean;
  origen: OrigenEspera;
  creada_at: number;
}

/** Datos para `abrir_viaje`. */
export interface DatosAbrirViaje {
  /** Texto libre, de 1 a 40 caracteres. */
  proveedor: string;
  /** Pesos; solo informativo. */
  precio_por_casa?: number;
  /** Por defecto 5; de 1 a 30. */
  minimo_casas?: number;
  /** Opcional; no menor que `minimo_casas`. */
  capacidad_aprox?: number;
  acepta_responsabilidad: true;
}

/** Cambios para `editar_viaje`. `null` borra un dato opcional. */
export interface CambiosViaje {
  proveedor?: string;
  precio_por_casa?: number | null;
  minimo_casas?: number;
  capacidad_aprox?: number | null;
}

/** Respuesta de `anotarse_cualquiera`: trae exactamente uno de los dos. */
export interface ResultadoAnotarseCualquiera {
  viaje?: ViajeVista;
  espera?: EsperaVista;
}

// ---------------------------------------------------------------------------
// Coordinador
// ---------------------------------------------------------------------------

export interface OpcionesListaCaseta {
  /** Incluir la columna de canal. */
  canal: boolean;
  /** Incluir la columna de días que lleva cada folio. */
  dias: boolean;
  formato: FormatoCaseta;
}

export interface FolioCaseta {
  /** Código completo. */
  codigo: string;
  canal: Canal;
  dias_que_lleva: number;
}

export interface FilaCaseta {
  casa_numero: string;
  folios: FolioCaseta[];
}

/** Lista para caseta ya generada. Generarla no cambia ningún folio. */
export interface ListaCaseta {
  envio_id: string;
  generada_at: number;
  opciones: OpcionesListaCaseta;
  /** Una fila por casa con folios activos, en el orden del catálogo. */
  filas: FilaCaseta[];
  total_casas: number;
  total_folios: number;
}

/** Teléfono registrado, solo para coordinadores. Nunca incluye el PIN. */
export interface TelefonoVista {
  numero: string;
  casa_numero: string | null;
  en_lista_blanca: boolean;
  es_coordinador: boolean;
  /** Si ya creó su PIN. */
  tiene_pin: boolean;
  bloqueado_hasta: number | null;
  reiniciado_at: number | null;
}

// ---------------------------------------------------------------------------
// Bitácora
// ---------------------------------------------------------------------------

/** Catálogo de tipos de evento de la bitácora. */
export const TIPOS_EVENTO = [
  "folio_registrado",
  "folio_reemplazado",
  "folio_extendido",
  "folio_surtido",
  "lista_caseta_generada",
  "viaje_abierto",
  "viaje_editado",
  "anotado",
  "anotado_cualquiera",
  "en_espera",
  "baja",
  "baja_despues_de_pedida",
  "viaje_lista",
  "viaje_pedido",
  "viaje_paso",
  "entrega_confirmada",
  "responsabilidad_tomada",
  "viaje_cerrado_72h",
  "viaje_cancelado",
  "salio_de_espera",
  "solicitud_creada",
  "solicitud_resuelta",
  "telefono_reiniciado",
  /** Solo en el demo. */
  "demo_reloj_adelantado",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export type RolEvento = "vecino" | "coordinador" | "sistema";

/**
 * Evento público de la bitácora. Identifica por casa, nunca por teléfono, y
 * los folios del detalle van enmascarados.
 */
export interface EventoVista {
  /** Orden total, creciente. */
  id: number;
  ocurrido_at: number;
  /** `null` cuando lo hizo el sistema. */
  casa_numero: string | null;
  rol: RolEvento;
  tipo: TipoEvento;
  detalle: Record<string, string | number | boolean | null>;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * La API completa. Cada método lista en su comentario los códigos de error
 * que puede devolver.
 */
export interface Api {
  // Sesión y acceso

  /** Sesión del celular. Sin errores de regla. */
  sesion_actual(): Promise<Resultado<Sesion>>;

  /**
   * Entra con teléfono y PIN; `casa` solo la primera vez.
   * Errores: `TELEFONO_INVALIDO`, `PIN_INVALIDO`, `PIN_INCORRECTO`,
   * `CASA_NO_EXISTE`, `CASA_OTRA_CALLE`, `BLOQUEADO`.
   */
  ingresar(
    telefono: string,
    pin: string,
    casa?: string,
  ): Promise<Resultado<Sesion>>;

  /**
   * Pide acceso para un teléfono fuera de lista o una casa fuera del
   * catálogo. Devuelve la solicitud sin teléfonos (ver
   * `SolicitudAccesoEnviada`).
   * Errores: `TELEFONO_INVALIDO`, `CASA_OTRA_CALLE`.
   */
  solicitar_acceso(
    telefono: string,
    casa_texto: string,
    motivo: MotivoSolicitud,
  ): Promise<Resultado<SolicitudAccesoEnviada>>;

  // Folios

  /** Folios de la casa de la sesión, con derivados. */
  listar_folios_casa(): Promise<Resultado<FolioVista[]>>;

  /**
   * Registra un folio; con `reemplaza_folio_id`, reemplaza uno activo del
   * mismo canal.
   * Errores: `FOLIO_FORMATO_INVALIDO`, `FOLIO_YA_USADO`, `TOPE_CANAL`,
   * `REEMPLAZO_INVALIDO`.
   */
  registrar_folio(
    codigo: string,
    reemplaza_folio_id?: string,
  ): Promise<Resultado<FolioVista>>;

  /**
   * "Sigue pendiente": extiende la vigencia una sola vez.
   * Errores: `NO_ENCONTRADO`, `YA_EXTENDIDO`, `FUERA_DE_PLAZO`,
   * `FOLIO_CERRADO`.
   */
  marcar_sigue_pendiente(folio_id: string): Promise<Resultado<FolioVista>>;

  /**
   * "Me surtieron". Con `quemar_otros`, también cierra los demás folios
   * activos de la casa. Devuelve los folios que cambiaron.
   * Errores: `NO_ENCONTRADO`, `FOLIO_CERRADO`.
   */
  marcar_surtido(
    folio_id: string,
    quemar_otros: boolean,
  ): Promise<Resultado<FolioVista[]>>;

  // Pipas

  /** Viajes no cerrados y los terminados en los últimos 4 días. */
  listar_viajes(): Promise<Resultado<ViajeVista[]>>;

  listar_espera(): Promise<Resultado<EsperaVista[]>>;

  /**
   * Abre un viaje; la casa de la sesión queda como responsable y anotada.
   * Errores: `DATOS_INVALIDOS`, `FALTA_ACEPTAR`, `YA_EN_VIAJE`.
   */
  abrir_viaje(datos: DatosAbrirViaje): Promise<Resultado<ViajeVista>>;

  /** Errores: `NO_ES_RESPONSABLE`, `VIAJE_CERRADO`, `DATOS_INVALIDOS`. */
  editar_viaje(
    viaje_id: string,
    cambios: CambiosViaje,
  ): Promise<Resultado<ViajeVista>>;

  /** Errores: `YA_EN_VIAJE`, `VIAJE_CERRADO`, `NO_ENCONTRADO`. */
  anotarse(viaje_id: string): Promise<Resultado<ViajeVista>>;

  /**
   * "Me da igual el proveedor": entra a un viaje o a la espera.
   * Errores: `YA_EN_VIAJE`.
   */
  anotarse_cualquiera(): Promise<Resultado<ResultadoAnotarseCualquiera>>;

  /** Errores: `NO_ANOTADO`, `ES_RESPONSABLE`, `VIAJE_CERRADO`. */
  dar_de_baja(viaje_id: string): Promise<Resultado<ViajeVista>>;

  /** Errores: `NO_ES_RESPONSABLE`, `NO_ESTA_LISTA`. */
  marcar_pedida(
    viaje_id: string,
    eta_texto: string,
  ): Promise<Resultado<ViajeVista>>;

  /** Errores: `NO_ES_RESPONSABLE`, `NO_ESTA_PEDIDA`. */
  marcar_ya_paso(viaje_id: string): Promise<Resultado<ViajeVista>>;

  /** Errores: `NO_ANOTADO`, `NO_HA_PASADO`, `YA_CONFIRMADO`. */
  confirmar_entrega(
    viaje_id: string,
    resultado: ResultadoEntrega,
  ): Promise<Resultado<ViajeVista>>;

  /**
   * Errores: `NO_ANOTADO`, `RESPONSABLE_ACTIVO`, `FALTA_ACEPTAR`,
   * `VIAJE_CERRADO`.
   */
  tomar_responsabilidad(
    viaje_id: string,
    acepta_responsabilidad: true,
  ): Promise<Resultado<ViajeVista>>;

  /** Errores: `NO_ES_RESPONSABLE`, `VIAJE_CERRADO`. */
  cancelar_viaje(viaje_id: string): Promise<Resultado<void>>;

  /** Errores: `NO_EN_ESPERA`. */
  salir_de_espera(): Promise<Resultado<void>>;

  // Coordinador

  /** Errores: `NO_AUTORIZADO`. */
  generar_lista_caseta(
    opciones: OpcionesListaCaseta,
  ): Promise<Resultado<ListaCaseta>>;

  /** Errores: `NO_AUTORIZADO`. */
  listar_solicitudes(): Promise<Resultado<SolicitudAcceso[]>>;

  /** Errores: `NO_AUTORIZADO`, `NO_ENCONTRADO`, `YA_RESUELTA`. */
  resolver_solicitud(
    id: string,
    aprobar: boolean,
    casa_asignada?: string,
  ): Promise<Resultado<SolicitudAcceso>>;

  /** Errores: `NO_AUTORIZADO`. */
  listar_telefonos(): Promise<Resultado<TelefonoVista[]>>;

  /** Errores: `NO_AUTORIZADO`, `NO_ENCONTRADO`. */
  reiniciar_telefono(telefono: string): Promise<Resultado<void>>;

  // Información

  /**
   * Bitácora pública, del evento más reciente al más antiguo.
   *
   * @param antes_de_id Solo eventos con `id` menor (para cargar más).
   * @param limite Máximo de eventos; por defecto 50.
   */
  bitacora(
    antes_de_id?: number,
    limite?: number,
  ): Promise<Resultado<EventoVista[]>>;
}

/** Funciones que solo existen en el demo. */
export interface ApiDemo {
  /** Cambia la sesión simulada sin pedir PIN. */
  demo_ver_como(perfil: PerfilDemo, casa?: string): Promise<Resultado<Sesion>>;

  /**
   * Adelanta el reloj simulado.
   *
   * @param horas Por defecto 24.
   */
  demo_adelantar_reloj(horas?: number): Promise<Resultado<{ ahora: number }>>;

  /** Regresa a los datos de ejemplo y al reloj real. */
  demo_reiniciar(): Promise<Resultado<void>>;
}
