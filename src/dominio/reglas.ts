export const HORA_MS = 60 * 60 * 1000;
export const DIA_MS = 24 * HORA_MS;

/** Vigencia de un folio recién registrado: 72 horas. */
export const VIGENCIA_FOLIO_MS = 3 * DIA_MS;
/** Tope de vigencia de un folio que se marcó "sigue pendiente": 6 días desde el registro. */
export const VIGENCIA_MAXIMA_FOLIO_MS = 6 * DIA_MS;
/** Folios activos permitidos por casa en cada canal. */
export const TOPE_FOLIOS_POR_CANAL = 2;
/** Un folio "vence hoy" cuando le faltan menos de 24 horas. */
export const AVISO_VENCE_HOY_MS = DIA_MS;

export const MINIMO_CASAS_POR_DEFECTO = 5;
export const MINIMO_CASAS_RANGO = { min: 1, max: 30 } as const;
/** Sin movimiento del responsable durante 24 horas, otra casa anotada puede tomar su lugar. */
export const INACTIVIDAD_RESPONSABLE_MS = DIA_MS;
/** Un viaje que no llega a "Ya pasó" se cierra a las 72 horas de abierto. */
export const CIERRE_VIAJE_MS = 3 * DIA_MS;
/** Pasadas 72 horas de "Ya pasó", una casa sin confirmar queda "sin confirmar". */
export const SIN_CONFIRMAR_MS = 3 * DIA_MS;
/** Un viaje con "Ya pasó" sigue en la lista 4 días, para que se vea el "sin confirmar" del día 3. */
export const VENTANA_VIAJES_TERMINADOS_MS = 4 * DIA_MS;

export const PATRON_FOLIO_WHATSAPP = /^SIAPAZAP\d{4,}$/;
export const PATRON_FOLIO_TELEFONO = /^1162\d{4,}$/;
/** Ayuntamiento de Zapopan: exactamente 4 dígitos. `1162` solo entra aquí. */
export const PATRON_FOLIO_AYUNTAMIENTO = /^\d{4}$/;

export const LONGITUD_TELEFONO = 10;
