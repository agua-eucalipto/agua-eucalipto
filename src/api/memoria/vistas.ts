import {
  INACTIVIDAD_RESPONSABLE_MS,
  SIN_CONFIRMAR_MS,
  diasQueLleva,
  estadoFolio,
  estadoViaje,
  ordenarAnotaciones,
  puedeExtender,
  venceAt,
  venceHoy,
} from "../../dominio";
import type {
  AnotacionVista,
  EsperaVista,
  EstadoViaje,
  EventoVista,
  FolioVista,
  Sesion,
  SolicitudAcceso,
  SolicitudAccesoEnviada,
  TelefonoVista,
  ViajeVista,
} from "../contrato";
import type {
  Anotacion,
  Espera,
  EstadoDemo,
  Evento,
  Folio,
  SesionDemo,
  Telefono,
  Viaje,
} from "./estado";

/**
 * Lo que sale de la `Api` se arma aquí, campo por campo, para que ningún dato
 * interno (teléfonos, quién registró) llegue a una respuesta por descuido.
 */

const PREFIJOS_FOLIO = ["SIAPAZAP", "1162"];

/**
 * `SIAPAZAP20261234` → `SIAPAZAP••••1234`.
 * Un folio de 4 dígitos se tapa por completo: los últimos 4 serían el código.
 */
export function enmascararFolio(codigo: string): string {
  if (/^\d{4}$/.test(codigo)) return "••••";
  const prefijo = PREFIJOS_FOLIO.find((p) => codigo.startsWith(p)) ?? "";
  return `${prefijo}••••${codigo.slice(-4)}`;
}

export function sesionVista(sesion: SesionDemo): Sesion {
  return { casa: sesion.casa, rol: sesion.rol };
}

// ---------------------------------------------------------------------------
// Folios
// ---------------------------------------------------------------------------

function ultimoEnvioCaseta(estado: EstadoDemo, folioId: string): number | null {
  let ultimo: number | null = null;
  for (const vinculo of estado.envios_caseta_folios) {
    if (vinculo.folio_id !== folioId) {
      continue;
    }
    const envio = estado.envios_caseta.find((e) => e.id === vinculo.envio_id);
    if (envio !== undefined && (ultimo === null || envio.creado_at > ultimo)) {
      ultimo = envio.creado_at;
    }
  }
  return ultimo;
}

export function folioVista(
  estado: EstadoDemo,
  folio: Folio,
  ahora: number,
): FolioVista {
  return {
    id: folio.id,
    codigo: folio.codigo,
    canal: folio.canal,
    casa_numero: folio.casa_numero,
    registrado_at: folio.registrado_at,
    extendido_at: folio.extendido_at,
    cierre: folio.cierre,
    cerrado_at: folio.cerrado_at,
    reemplazado_por: folio.reemplazado_por,
    estado: estadoFolio(folio, ahora),
    vence_at: venceAt(folio),
    dias_que_lleva: diasQueLleva(folio.registrado_at, ahora),
    puede_extender: puedeExtender(folio, ahora),
    vence_hoy: venceHoy(folio, ahora),
    ultimo_envio_caseta_at: ultimoEnvioCaseta(estado, folio.id),
  };
}

// ---------------------------------------------------------------------------
// Viajes
// ---------------------------------------------------------------------------

export function anotacionesDe(estado: EstadoDemo, viajeId: string) {
  return estado.anotaciones.filter((a) => a.viaje_id === viajeId);
}

/** Anotaciones `anotada` del viaje, ya en el orden de la lista. */
export function anotadasEnOrden(
  estado: EstadoDemo,
  viajeId: string,
): Anotacion[] {
  return ordenarAnotaciones(anotacionesDe(estado, viajeId));
}

export function estadoDe(estado: EstadoDemo, viaje: Viaje): EstadoViaje {
  return estadoViaje(viaje, anotadasEnOrden(estado, viaje.id).length);
}

export function viajeTerminado(viaje: Viaje): boolean {
  return viaje.paso_at !== null || viaje.cerrado_sin_completar_at !== null;
}

export function responsableInactivo(viaje: Viaje, ahora: number): boolean {
  return (
    !viajeTerminado(viaje) &&
    ahora >= viaje.ultima_actividad_responsable_at + INACTIVIDAD_RESPONSABLE_MS
  );
}

function anotacionVista(
  anotacion: Anotacion,
  sinConfirmar: boolean,
  excedeCapacidad: boolean,
): AnotacionVista {
  return {
    id: anotacion.id,
    casa_numero: anotacion.casa_numero,
    antiguedad_desde: anotacion.antiguedad_desde,
    con_prioridad: anotacion.con_prioridad,
    anotada_at: anotacion.anotada_at,
    estado: anotacion.estado,
    estado_at: anotacion.estado_at,
    sin_confirmar: sinConfirmar,
    excede_capacidad: excedeCapacidad,
  };
}

/**
 * Primero las anotadas en el orden del viaje; después, las que ya no cuentan
 * pero deben verse (baja después de pedida, confirmadas, movidas a la
 * espera). Las bajas libres de antes de pedir no se muestran.
 */
export function viajeVista(
  estado: EstadoDemo,
  viaje: Viaje,
  ahora: number,
  casaSesion: string | null,
): ViajeVista {
  const filas = anotacionesDe(estado, viaje.id);
  const anotadas = ordenarAnotaciones(filas);
  const visibles = filas
    .filter((a) => a.estado !== "anotada" && a.estado !== "baja")
    .sort((a, b) => a.estado_at - b.estado_at || a.anotada_at - b.anotada_at);
  const situacion = estadoViaje(viaje, anotadas.length);
  const sinConfirmar =
    viaje.paso_at !== null &&
    situacion === "ya_paso" &&
    ahora >= viaje.paso_at + SIN_CONFIRMAR_MS;
  const capacidad = viaje.capacidad_aprox;
  return {
    id: viaje.id,
    proveedor: viaje.proveedor,
    precio_por_casa: viaje.precio_por_casa,
    minimo_casas: viaje.minimo_casas,
    capacidad_aprox: viaje.capacidad_aprox,
    responsable_casa: viaje.responsable_casa,
    abierto_at: viaje.abierto_at,
    pedido_at: viaje.pedido_at,
    eta_texto: viaje.eta_texto,
    paso_at: viaje.paso_at,
    cerrado_sin_completar_at: viaje.cerrado_sin_completar_at,
    estado: situacion,
    anotadas: anotadas.length,
    anotaciones: [
      ...anotadas.map((a, i) =>
        anotacionVista(a, sinConfirmar, capacidad !== null && i >= capacidad),
      ),
      ...visibles.map((a) => anotacionVista(a, false, false)),
    ],
    puede_que_no_alcance: capacidad !== null && anotadas.length > capacidad,
    responsable_inactivo: responsableInactivo(viaje, ahora),
    soy_responsable:
      casaSesion !== null && viaje.responsable_casa === casaSesion,
    estoy_anotado:
      casaSesion !== null && anotadas.some((a) => a.casa_numero === casaSesion),
  };
}

/** Con prioridad primero, luego la más antigua esperando, luego la que llegó antes. */
export function esperaEnOrden(estado: EstadoDemo): Espera[] {
  return [...estado.espera].sort(
    (a, b) =>
      Number(b.con_prioridad) - Number(a.con_prioridad) ||
      a.antiguedad_desde - b.antiguedad_desde ||
      a.creada_at - b.creada_at,
  );
}

export function esperaVista(fila: Espera): EsperaVista {
  return {
    casa_numero: fila.casa_numero,
    antiguedad_desde: fila.antiguedad_desde,
    con_prioridad: fila.con_prioridad,
    origen: fila.origen,
    creada_at: fila.creada_at,
  };
}

// ---------------------------------------------------------------------------
// Acceso, coordinador y bitácora
// ---------------------------------------------------------------------------

export function solicitudVista(solicitud: SolicitudAcceso): SolicitudAcceso {
  return { ...solicitud };
}

/** La solicitud sin ningún teléfono, para quien la acaba de enviar. */
export function solicitudEnviadaVista(
  solicitud: SolicitudAcceso,
): SolicitudAccesoEnviada {
  return {
    id: solicitud.id,
    casa_texto: solicitud.casa_texto,
    motivo: solicitud.motivo,
    estado: solicitud.estado,
    creada_at: solicitud.creada_at,
    resuelta_at: solicitud.resuelta_at,
  };
}

export function telefonoVista(telefono: Telefono): TelefonoVista {
  return {
    numero: telefono.numero,
    casa_numero: telefono.casa_numero,
    en_lista_blanca: telefono.en_lista_blanca,
    es_coordinador: telefono.es_coordinador,
    tiene_pin: telefono.pin_hash !== null,
    bloqueado_hasta: telefono.bloqueado_hasta,
    reiniciado_at: telefono.reiniciado_at,
  };
}

export function eventoVista(evento: Evento): EventoVista {
  return {
    id: evento.id,
    ocurrido_at: evento.ocurrido_at,
    casa_numero: evento.casa_numero,
    rol: evento.rol,
    tipo: evento.tipo,
    detalle: { ...evento.detalle },
  };
}
