import {
  MINIMO_CASAS_POR_DEFECTO,
  MINIMO_CASAS_RANGO,
  SIN_CONFIRMAR_MS,
  VENTANA_VIAJES_TERMINADOS_MS,
} from "../../dominio";
import type {
  CambiosViaje,
  DatosAbrirViaje,
  EsperaVista,
  OrigenEspera,
  Resultado,
  ResultadoAnotarseCualquiera,
  ResultadoEntrega,
  ViajeVista,
} from "../contrato";
import type { Anotacion, Viaje } from "./estado";
import { Transaccion, exito, falla } from "./transaccion";
import {
  anotadasEnOrden,
  esperaEnOrden,
  esperaVista,
  estadoDe,
  responsableInactivo,
  viajeTerminado,
  viajeVista,
} from "./vistas";

const LARGO_PROVEEDOR = { min: 1, max: 40 } as const;
const LARGO_ETA = 60;

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function vista(tx: Transaccion, viaje: Viaje): ViajeVista {
  return viajeVista(tx.estado, viaje, tx.ahora, tx.casa());
}

function buscar(tx: Transaccion, id: string): Viaje | undefined {
  return tx.estado.viajes.find((v) => v.id === id);
}

function aceptaAnotaciones(tx: Transaccion, viaje: Viaje): boolean {
  const estado = estadoDe(tx.estado, viaje);
  return estado === "juntando" || estado === "lista";
}

function anotacionDe(
  tx: Transaccion,
  viaje: Viaje,
  casa: string,
): Anotacion | undefined {
  return tx.estado.anotaciones.find(
    (a) => a.viaje_id === viaje.id && a.casa_numero === casa,
  );
}

/** P-01: el viaje activo (juntando, lista o pedida) donde la casa está anotada. */
function viajeActivoDe(tx: Transaccion, casa: string): Viaje | undefined {
  for (const anotacion of tx.estado.anotaciones) {
    if (anotacion.casa_numero !== casa || anotacion.estado !== "anotada") {
      continue;
    }
    const viaje = buscar(tx, anotacion.viaje_id);
    if (viaje !== undefined && !viajeTerminado(viaje)) {
      return viaje;
    }
  }
  return undefined;
}

/**
 * Anota a la casa en el viaje. Si venía de la espera, sale de ella con su
 * antigüedad y su prioridad (P-01, P-02); si no, su antigüedad empieza ahora.
 * Una casa tiene una sola fila por viaje: si ya se había dado de baja, la
 * misma fila vuelve a `anotada`.
 */
function anotar(tx: Transaccion, viaje: Viaje, casa: string): void {
  const indice = tx.estado.espera.findIndex((e) => e.casa_numero === casa);
  const desdeEspera =
    indice === -1 ? undefined : tx.estado.espera.splice(indice, 1)[0];
  const datos = {
    antiguedad_desde: desdeEspera?.antiguedad_desde ?? tx.ahora,
    con_prioridad: desdeEspera?.con_prioridad ?? false,
    anotada_at: tx.ahora,
    estado: "anotada" as const,
    estado_at: tx.ahora,
  };
  const existente = anotacionDe(tx, viaje, casa);
  if (existente !== undefined) {
    Object.assign(existente, datos);
  } else {
    tx.estado.anotaciones.push({
      id: tx.nuevoId(),
      viaje_id: viaje.id,
      casa_numero: casa,
      ...datos,
    });
  }
}

/** El evento `viaje_lista` se registra solo la primera vez que se llega al mínimo. */
function avisarSiLlegaALista(tx: Transaccion, viaje: Viaje): void {
  if (estadoDe(tx.estado, viaje) !== "lista") {
    return;
  }
  const yaAvisado = tx.estado.eventos.some(
    (e) => e.tipo === "viaje_lista" && e.detalle.viaje_id === viaje.id,
  );
  if (!yaAvisado) {
    tx.evento("viaje_lista", {
      viaje_id: viaje.id,
      anotadas: anotadasEnOrden(tx.estado, viaje.id).length,
    });
  }
}

/**
 * Pone a la casa en la espera. Si ya está anotada en un viaje activo no hace
 * falta; si ya estaba en la espera, conserva la antigüedad más vieja y la
 * prioridad si alguna la tenía. Devuelve si entró una fila nueva.
 */
function entrarAEspera(
  tx: Transaccion,
  casa: string,
  antiguedad: number,
  conPrioridad: boolean,
  origen: OrigenEspera,
): boolean {
  if (viajeActivoDe(tx, casa) !== undefined) {
    return false;
  }
  const existente = tx.estado.espera.find((e) => e.casa_numero === casa);
  if (existente !== undefined) {
    existente.antiguedad_desde = Math.min(
      existente.antiguedad_desde,
      antiguedad,
    );
    existente.con_prioridad ||= conPrioridad;
    return false;
  }
  tx.estado.espera.push({
    casa_numero: casa,
    antiguedad_desde: antiguedad,
    con_prioridad: conPrioridad,
    origen,
    creada_at: tx.ahora,
  });
  return true;
}

/**
 * P-11 y P-14: cierra el viaje sin completar y manda a la espera a las casas
 * anotadas, con su antigüedad y su prioridad. Devuelve cuántas se movieron.
 */
export function cerrarSinCompletar(tx: Transaccion, viaje: Viaje): number {
  const anotadas = anotadasEnOrden(tx.estado, viaje.id);
  viaje.cerrado_sin_completar_at = tx.ahora;
  for (const anotacion of anotadas) {
    anotacion.estado = "movida_a_espera";
    anotacion.estado_at = tx.ahora;
    entrarAEspera(
      tx,
      anotacion.casa_numero,
      anotacion.antiguedad_desde,
      anotacion.con_prioridad,
      "viaje_cerrado",
    );
  }
  return anotadas.length;
}

interface DatosViaje {
  proveedor: string;
  precio_por_casa: number | null;
  minimo_casas: number;
  capacidad_aprox: number | null;
}

function datosValidos(d: DatosViaje): boolean {
  const entero = (n: unknown): n is number =>
    typeof n === "number" && Number.isInteger(n);
  return (
    d.proveedor.length >= LARGO_PROVEEDOR.min &&
    d.proveedor.length <= LARGO_PROVEEDOR.max &&
    (d.precio_por_casa === null ||
      (entero(d.precio_por_casa) && d.precio_por_casa >= 0)) &&
    entero(d.minimo_casas) &&
    d.minimo_casas >= MINIMO_CASAS_RANGO.min &&
    d.minimo_casas <= MINIMO_CASAS_RANGO.max &&
    (d.capacidad_aprox === null ||
      (entero(d.capacidad_aprox) && d.capacidad_aprox >= d.minimo_casas))
  );
}

function textoProveedor(proveedor: unknown): string {
  return typeof proveedor === "string" ? proveedor.trim() : "";
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/** Viajes no cerrados; los que ya pasaron se quedan 4 días más. */
export function listarViajes(tx: Transaccion): Resultado<ViajeVista[]> {
  if (tx.casa() === null) {
    return falla("NO_AUTORIZADO");
  }
  const visibles = tx.estado.viajes.filter(
    (v) =>
      v.cerrado_sin_completar_at === null &&
      (v.paso_at === null ||
        tx.ahora - v.paso_at <= VENTANA_VIAJES_TERMINADOS_MS),
  );
  return exito(
    [...visibles]
      .sort((a, b) => a.abierto_at - b.abierto_at)
      .map((v) => vista(tx, v)),
  );
}

export function listarEspera(tx: Transaccion): Resultado<EsperaVista[]> {
  if (tx.casa() === null) {
    return falla("NO_AUTORIZADO");
  }
  return exito(esperaEnOrden(tx.estado).map(esperaVista));
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/** P-02: abre el viaje con la casa como responsable y suma a toda la espera. */
export function abrirViaje(
  tx: Transaccion,
  datos: DatosAbrirViaje,
): Resultado<ViajeVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  if (datos.acepta_responsabilidad !== true) {
    return falla("FALTA_ACEPTAR");
  }
  const campos: DatosViaje = {
    proveedor: textoProveedor(datos.proveedor),
    precio_por_casa: datos.precio_por_casa ?? null,
    minimo_casas: datos.minimo_casas ?? MINIMO_CASAS_POR_DEFECTO,
    capacidad_aprox: datos.capacidad_aprox ?? null,
  };
  if (!datosValidos(campos)) {
    return falla("DATOS_INVALIDOS");
  }
  if (viajeActivoDe(tx, casa) !== undefined) {
    return falla("YA_EN_VIAJE");
  }

  const viaje: Viaje = {
    id: tx.nuevoId(),
    ...campos,
    responsable_casa: casa,
    abierto_at: tx.ahora,
    pedido_at: null,
    eta_texto: null,
    paso_at: null,
    cerrado_sin_completar_at: null,
    ultima_actividad_responsable_at: tx.ahora,
  };
  tx.estado.viajes.push(viaje);
  anotar(tx, viaje, casa);
  const enEspera = esperaEnOrden(tx.estado);
  for (const fila of enEspera) {
    anotar(tx, viaje, fila.casa_numero);
  }
  tx.evento("viaje_abierto", {
    viaje_id: viaje.id,
    proveedor: viaje.proveedor,
    desde_espera: enEspera.length,
  });
  avisarSiLlegaALista(tx, viaje);
  return exito(vista(tx, viaje));
}

/** P-15: solo el responsable y antes de pedir. */
export function editarViaje(
  tx: Transaccion,
  viajeId: string,
  cambios: CambiosViaje,
): Resultado<ViajeVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const viaje = buscar(tx, viajeId);
  if (viaje === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (viaje.responsable_casa !== casa) {
    return falla("NO_ES_RESPONSABLE");
  }
  if (!aceptaAnotaciones(tx, viaje)) {
    return falla("VIAJE_CERRADO");
  }
  const campos: DatosViaje = {
    proveedor:
      cambios.proveedor === undefined
        ? viaje.proveedor
        : textoProveedor(cambios.proveedor),
    precio_por_casa:
      cambios.precio_por_casa === undefined
        ? viaje.precio_por_casa
        : cambios.precio_por_casa,
    minimo_casas: cambios.minimo_casas ?? viaje.minimo_casas,
    capacidad_aprox:
      cambios.capacidad_aprox === undefined
        ? viaje.capacidad_aprox
        : cambios.capacidad_aprox,
  };
  if (!datosValidos(campos)) {
    return falla("DATOS_INVALIDOS");
  }
  Object.assign(viaje, campos);
  viaje.ultima_actividad_responsable_at = tx.ahora;
  tx.evento("viaje_editado", { viaje_id: viaje.id });
  avisarSiLlegaALista(tx, viaje);
  return exito(vista(tx, viaje));
}

export function anotarse(
  tx: Transaccion,
  viajeId: string,
): Resultado<ViajeVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const viaje = buscar(tx, viajeId);
  if (viaje === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (!aceptaAnotaciones(tx, viaje)) {
    return falla("VIAJE_CERRADO");
  }
  if (viajeActivoDe(tx, casa) !== undefined) {
    return falla("YA_EN_VIAJE");
  }
  anotar(tx, viaje, casa);
  tx.evento("anotado", { viaje_id: viaje.id });
  avisarSiLlegaALista(tx, viaje);
  return exito(vista(tx, viaje));
}

/**
 * P-13: entra al viaje abierto con más casas (en empate, el más antiguo); si
 * no hay, a la espera sin prioridad. Si ya estaba en la espera, se queda igual.
 */
export function anotarseCualquiera(
  tx: Transaccion,
): Resultado<ResultadoAnotarseCualquiera> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  if (viajeActivoDe(tx, casa) !== undefined) {
    return falla("YA_EN_VIAJE");
  }
  const candidatos = tx.estado.viajes
    .filter((v) => aceptaAnotaciones(tx, v))
    .map((v) => ({ v, anotadas: anotadasEnOrden(tx.estado, v.id).length }))
    .sort((a, b) => b.anotadas - a.anotadas || a.v.abierto_at - b.v.abierto_at);
  const elegido = candidatos[0]?.v;
  if (elegido !== undefined) {
    anotar(tx, elegido, casa);
    tx.evento("anotado_cualquiera", { viaje_id: elegido.id });
    avisarSiLlegaALista(tx, elegido);
    return exito({ viaje: vista(tx, elegido) });
  }
  if (entrarAEspera(tx, casa, tx.ahora, false, "me_da_igual")) {
    tx.evento("en_espera", { origen: "me_da_igual" });
  }
  const fila = tx.estado.espera.find((e) => e.casa_numero === casa);
  if (fila === undefined) {
    throw new Error("la casa debía quedar en la espera");
  }
  return exito({ espera: esperaVista(fila) });
}

/** P-07: libre antes de pedir; después de pedir queda visible. */
export function darDeBaja(
  tx: Transaccion,
  viajeId: string,
): Resultado<ViajeVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const viaje = buscar(tx, viajeId);
  if (viaje === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (viajeTerminado(viaje)) {
    return falla("VIAJE_CERRADO");
  }
  const anotacion = anotacionDe(tx, viaje, casa);
  if (anotacion === undefined || anotacion.estado !== "anotada") {
    return falla("NO_ANOTADO");
  }
  if (viaje.responsable_casa === casa) {
    return falla("ES_RESPONSABLE");
  }
  const nuevo =
    estadoDe(tx.estado, viaje) === "pedida" ? "baja_despues_de_pedida" : "baja";
  anotacion.estado = nuevo;
  anotacion.estado_at = tx.ahora;
  tx.evento(nuevo, { viaje_id: viaje.id });
  return exito(vista(tx, viaje));
}

/** El viaje existe y la casa de la sesión es su responsable. */
function delResponsable(tx: Transaccion, viajeId: string): Resultado<Viaje> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const viaje = buscar(tx, viajeId);
  if (viaje === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (viaje.responsable_casa !== casa) {
    return falla("NO_ES_RESPONSABLE");
  }
  return exito(viaje);
}

/** P-05: desde lista y solo el responsable. */
export function marcarPedida(
  tx: Transaccion,
  viajeId: string,
  etaTexto: string,
): Resultado<ViajeVista> {
  const r = delResponsable(tx, viajeId);
  if (!r.ok) {
    return r;
  }
  const viaje = r.datos;
  if (estadoDe(tx.estado, viaje) !== "lista") {
    return falla("NO_ESTA_LISTA");
  }
  const eta = typeof etaTexto === "string" ? etaTexto.trim() : "";
  viaje.pedido_at = tx.ahora;
  viaje.eta_texto = eta === "" ? null : eta.slice(0, LARGO_ETA);
  viaje.ultima_actividad_responsable_at = tx.ahora;
  tx.evento("viaje_pedido", { viaje_id: viaje.id });
  return exito(vista(tx, viaje));
}

/** P-08: desde pedida y solo el responsable. */
export function marcarYaPaso(
  tx: Transaccion,
  viajeId: string,
): Resultado<ViajeVista> {
  const r = delResponsable(tx, viajeId);
  if (!r.ok) {
    return r;
  }
  const viaje = r.datos;
  if (estadoDe(tx.estado, viaje) !== "pedida") {
    return falla("NO_ESTA_PEDIDA");
  }
  viaje.paso_at = tx.ahora;
  viaje.ultima_actividad_responsable_at = tx.ahora;
  tx.evento("viaje_paso", { viaje_id: viaje.id });
  return exito(vista(tx, viaje));
}

/**
 * P-09: cada casa anotada confirma. "Pendiente" la manda a la espera con
 * prioridad y su antigüedad. Pasadas 72 h ya no se confirma (P-10).
 */
export function confirmarEntrega(
  tx: Transaccion,
  viajeId: string,
  resultado: ResultadoEntrega,
): Resultado<ViajeVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const viaje = buscar(tx, viajeId);
  if (viaje === undefined) {
    return falla("NO_ENCONTRADO");
  }
  const anotacion = anotacionDe(tx, viaje, casa);
  if (
    anotacion !== undefined &&
    (anotacion.estado === "surtio" || anotacion.estado === "pendiente")
  ) {
    return falla("YA_CONFIRMADO");
  }
  if (anotacion === undefined || anotacion.estado !== "anotada") {
    return falla("NO_ANOTADO");
  }
  if (viaje.paso_at === null || estadoDe(tx.estado, viaje) !== "ya_paso") {
    return falla("NO_HA_PASADO");
  }
  if (tx.ahora >= viaje.paso_at + SIN_CONFIRMAR_MS) {
    return falla("NO_ANOTADO", "Pasó el plazo para confirmar");
  }
  anotacion.estado = resultado === "pendiente" ? "pendiente" : "surtio";
  anotacion.estado_at = tx.ahora;
  tx.evento("entrega_confirmada", {
    viaje_id: viaje.id,
    resultado: anotacion.estado,
  });
  if (
    anotacion.estado === "pendiente" &&
    entrarAEspera(tx, casa, anotacion.antiguedad_desde, true, "pendiente")
  ) {
    tx.evento("en_espera", { origen: "pendiente" });
  }
  return exito(vista(tx, viaje));
}

/** P-12: una casa anotada toma el viaje tras 24 h sin actividad del responsable. */
export function tomarResponsabilidad(
  tx: Transaccion,
  viajeId: string,
  aceptaResponsabilidad: true,
): Resultado<ViajeVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const viaje = buscar(tx, viajeId);
  if (viaje === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (viajeTerminado(viaje)) {
    return falla("VIAJE_CERRADO");
  }
  if (anotacionDe(tx, viaje, casa)?.estado !== "anotada") {
    return falla("NO_ANOTADO");
  }
  if (aceptaResponsabilidad !== true) {
    return falla("FALTA_ACEPTAR");
  }
  if (
    viaje.responsable_casa === casa ||
    !responsableInactivo(viaje, tx.ahora)
  ) {
    return falla("RESPONSABLE_ACTIVO");
  }
  const anterior = viaje.responsable_casa;
  viaje.responsable_casa = casa;
  viaje.ultima_actividad_responsable_at = tx.ahora;
  tx.evento("responsabilidad_tomada", {
    viaje_id: viaje.id,
    responsable_anterior: anterior,
  });
  return exito(vista(tx, viaje));
}

/** P-14: el responsable cancela antes de pedir; las casas pasan a la espera. */
export function cancelarViaje(
  tx: Transaccion,
  viajeId: string,
): Resultado<void> {
  const r = delResponsable(tx, viajeId);
  if (!r.ok) {
    return r;
  }
  const viaje = r.datos;
  if (!aceptaAnotaciones(tx, viaje)) {
    return falla("VIAJE_CERRADO");
  }
  const movidas = cerrarSinCompletar(tx, viaje);
  tx.evento("viaje_cancelado", {
    viaje_id: viaje.id,
    casas_a_espera: movidas,
  });
  return exito(undefined);
}

export function salirDeEspera(tx: Transaccion): Resultado<void> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const indice = tx.estado.espera.findIndex((e) => e.casa_numero === casa);
  if (indice === -1) {
    return falla("NO_EN_ESPERA");
  }
  tx.estado.espera.splice(indice, 1);
  tx.evento("salio_de_espera");
  return exito(undefined);
}
