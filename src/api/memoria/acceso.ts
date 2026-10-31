import { normalizarTelefono } from "../../dominio";
import type {
  MotivoSolicitud,
  PerfilDemo,
  Resultado,
  Sesion,
  SolicitudAcceso,
  SolicitudAccesoEnviada,
  TelefonoVista,
} from "../contrato";
import { ordenDeCasa, sinSesion, type EstadoDemo } from "./estado";
import { Transaccion, exito, falla } from "./transaccion";
import {
  sesionVista,
  solicitudEnviadaVista,
  solicitudVista,
  telefonoVista,
} from "./vistas";

const PIN_VALIDO = /^\d{4}$/;
/** En el demo no se guarda el PIN (cualquiera de 4 dígitos entra): solo se marca que ya existe. */
const PIN_SIMULADO = "demo-sin-pin";

/** Casa de "Ver como" cuando no se indica. */
const CASA_VECINO_DEMO = "7";
const CASA_COORDINADOR_DEMO = "3";

function comparable(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Calle del coto, distinta de la de la lista, con la que empieza el texto. */
function otraCalleDelCoto(estado: EstadoDemo, texto: string): string | null {
  const t = comparable(texto);
  const otra = estado.calles_del_coto.find(
    (calle) =>
      comparable(calle) !== comparable(estado.calle) &&
      t.startsWith(comparable(calle)),
  );
  return otra ?? null;
}

/** "7", "Eucalipto 7" o "#7" → "7". */
function numeroDeCasa(estado: EstadoDemo, texto: string): string {
  let t = texto.trim();
  if (comparable(t).startsWith(comparable(estado.calle))) {
    t = t.slice(estado.calle.length).trim();
  }
  return t.replace(/^#\s*/, "");
}

export function sesionActual(tx: Transaccion): Resultado<Sesion> {
  return exito(sesionVista(tx.estado.sesion));
}

/**
 * A-01, simulado: entra cualquier PIN de 4 dígitos para un teléfono de la
 * lista; la primera vez se elige la casa.
 */
export function ingresar(
  tx: Transaccion,
  telefono: string,
  pin: string,
  casa?: string,
): Resultado<Sesion> {
  const numero = normalizarTelefono(
    typeof telefono === "string" ? telefono : "",
  );
  if (numero === null) {
    return falla("TELEFONO_INVALIDO");
  }
  if (typeof pin !== "string" || !PIN_VALIDO.test(pin)) {
    return falla("PIN_INVALIDO");
  }
  const registro = tx.estado.telefonos.find((t) => t.numero === numero);
  if (registro === undefined || !registro.en_lista_blanca) {
    const pendiente = tx.estado.solicitudes.some(
      (s) => s.telefono === numero && s.estado === "pendiente",
    );
    if (!pendiente) {
      return falla(
        "TELEFONO_INVALIDO",
        "El teléfono no está en la lista; hay que pedir acceso",
      );
    }
    tx.estado.sesion = { telefono: numero, casa: null, rol: "pendiente" };
    return exito(sesionVista(tx.estado.sesion));
  }
  if (registro.casa_numero === null) {
    if (casa === undefined || casa.trim() === "") {
      return falla("CASA_NO_EXISTE", "Falta elegir la casa");
    }
    if (otraCalleDelCoto(tx.estado, casa) !== null) {
      return falla("CASA_OTRA_CALLE");
    }
    const numeroCasa = numeroDeCasa(tx.estado, casa);
    if (!tx.estado.casas.some((c) => c.numero === numeroCasa)) {
      return falla("CASA_NO_EXISTE");
    }
    registro.casa_numero = numeroCasa;
  }
  registro.pin_hash ??= PIN_SIMULADO;
  registro.intentos_fallidos = 0;
  tx.estado.sesion = {
    telefono: numero,
    casa: registro.casa_numero,
    rol: registro.es_coordinador ? "coordinador" : "vecino",
  };
  return exito(sesionVista(tx.estado.sesion));
}

/** A-02 y A-03: crea la solicitud, salvo que la casa sea de otra calle del coto. */
export function solicitarAcceso(
  tx: Transaccion,
  telefono: string,
  casaTexto: string,
  motivo: MotivoSolicitud,
): Resultado<SolicitudAccesoEnviada> {
  const numero = normalizarTelefono(
    typeof telefono === "string" ? telefono : "",
  );
  if (numero === null) {
    return falla("TELEFONO_INVALIDO");
  }
  const texto = typeof casaTexto === "string" ? casaTexto.trim() : "";
  if (otraCalleDelCoto(tx.estado, texto) !== null) {
    return falla("CASA_OTRA_CALLE");
  }
  const solicitud: SolicitudAcceso = {
    id: tx.nuevoId(),
    telefono: numero,
    casa_texto: texto,
    motivo,
    estado: "pendiente",
    creada_at: tx.ahora,
    resuelta_at: null,
    resuelta_por: null,
  };
  tx.estado.solicitudes.push(solicitud);
  // Quien ya tiene sesión de vecino o coordinador la conserva.
  if (tx.casa() === null) {
    tx.estado.sesion = { telefono: numero, casa: null, rol: "pendiente" };
  }
  tx.evento("solicitud_creada", { solicitud_id: solicitud.id, motivo });
  return exito(solicitudEnviadaVista(solicitud));
}

// ---------------------------------------------------------------------------
// Coordinador
// ---------------------------------------------------------------------------

export function listarSolicitudes(
  tx: Transaccion,
): Resultado<SolicitudAcceso[]> {
  if (!tx.esCoordinador()) {
    return falla("NO_AUTORIZADO");
  }
  return exito(
    [...tx.estado.solicitudes]
      .sort((a, b) => a.creada_at - b.creada_at)
      .map(solicitudVista),
  );
}

/**
 * Al aprobar, el teléfono entra a la lista blanca; con `casa_asignada` queda
 * vinculado a esa casa, que se agrega al catálogo como excepción si no existía.
 */
export function resolverSolicitud(
  tx: Transaccion,
  id: string,
  aprobar: boolean,
  casaAsignada?: string,
): Resultado<SolicitudAcceso> {
  if (!tx.esCoordinador()) {
    return falla("NO_AUTORIZADO");
  }
  const solicitud = tx.estado.solicitudes.find((s) => s.id === id);
  if (solicitud === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (solicitud.estado !== "pendiente") {
    return falla("YA_RESUELTA");
  }
  solicitud.estado = aprobar ? "aprobada" : "rechazada";
  solicitud.resuelta_at = tx.ahora;
  solicitud.resuelta_por = tx.estado.sesion.telefono;
  if (aprobar) {
    aprobarTelefono(tx, solicitud, casaAsignada?.trim() || null);
  }
  tx.evento("solicitud_resuelta", {
    solicitud_id: solicitud.id,
    aprobada: aprobar,
  });
  return exito(solicitudVista(solicitud));
}

function aprobarTelefono(
  tx: Transaccion,
  solicitud: SolicitudAcceso,
  casa: string | null,
): void {
  if (casa !== null && !tx.estado.casas.some((c) => c.numero === casa)) {
    const calle = solicitud.casa_texto.replace(/[\s#]*[\w-]*\d[\w-]*$/, "");
    tx.estado.casas.push({
      numero: casa,
      calle: calle.trim() || tx.estado.calle,
      orden: ordenDeCasa(casa),
      es_excepcion: true,
      creada_at: tx.ahora,
    });
  }
  let registro = tx.estado.telefonos.find(
    (t) => t.numero === solicitud.telefono,
  );
  if (registro === undefined) {
    registro = {
      numero: solicitud.telefono,
      casa_numero: null,
      en_lista_blanca: true,
      pin_hash: null,
      es_coordinador: false,
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      reiniciado_at: null,
    };
    tx.estado.telefonos.push(registro);
  }
  registro.en_lista_blanca = true;
  if (casa !== null) {
    registro.casa_numero = casa;
  }
}

export function listarTelefonos(tx: Transaccion): Resultado<TelefonoVista[]> {
  if (!tx.esCoordinador()) {
    return falla("NO_AUTORIZADO");
  }
  return exito(
    [...tx.estado.telefonos]
      .sort((a, b) => a.numero.localeCompare(b.numero))
      .map(telefonoVista),
  );
}

/** A-04: borra el PIN y la casa del teléfono y cierra su sesión. */
export function reiniciarTelefono(
  tx: Transaccion,
  telefono: string,
): Resultado<void> {
  if (!tx.esCoordinador()) {
    return falla("NO_AUTORIZADO");
  }
  const numero = normalizarTelefono(
    typeof telefono === "string" ? telefono : "",
  );
  const registro = tx.estado.telefonos.find((t) => t.numero === numero);
  if (registro === undefined) {
    return falla("NO_ENCONTRADO");
  }
  const casaAnterior = registro.casa_numero;
  registro.casa_numero = null;
  registro.pin_hash = null;
  registro.intentos_fallidos = 0;
  registro.bloqueado_hasta = null;
  registro.reiniciado_at = tx.ahora;
  tx.evento("telefono_reiniciado", { casa_afectada: casaAnterior });
  if (tx.estado.sesion.telefono === registro.numero) {
    tx.estado.sesion = sinSesion();
  }
  return exito(undefined);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

/** "Ver como": cambia la sesión simulada sin pedir PIN. */
export function verComo(
  tx: Transaccion,
  perfil: PerfilDemo,
  casa?: string,
): Resultado<Sesion> {
  if (perfil === "otra_calle") {
    tx.estado.sesion = sinSesion();
    return exito(sesionVista(tx.estado.sesion));
  }
  const coordinador = perfil === "coordinador";
  const numeroCasa =
    casa ?? (coordinador ? CASA_COORDINADOR_DEMO : CASA_VECINO_DEMO);
  if (!tx.estado.casas.some((c) => c.numero === numeroCasa)) {
    return falla("CASA_NO_EXISTE");
  }
  const telefonos = tx.estado.telefonos.filter(
    (t) => !coordinador || t.es_coordinador,
  );
  const telefono =
    telefonos.find((t) => t.casa_numero === numeroCasa) ??
    (coordinador ? telefonos[0] : undefined);
  tx.estado.sesion = {
    telefono: telefono?.numero ?? null,
    casa: numeroCasa,
    rol: coordinador ? "coordinador" : "vecino",
  };
  return exito(sesionVista(tx.estado.sesion));
}
