import { expect } from "vitest";
import type {
  AnotacionVista,
  Api,
  CodigoError,
  DatosAbrirViaje,
  EsperaVista,
  EventoVista,
  FolioVista,
  Resultado,
  ResultadoEntrega,
  ViajeVista,
} from "../../src/api/contrato";
import type { Contexto } from "./escenario";
import { telefonoDe } from "./mundo";

export const MIN = 60 * 1000;
export const HORA = 60 * MIN;
export const DIA = 24 * HORA;

/** Folio de WhatsApp con 8 dígitos (nunca 10 seguidos). */
export function wa(n: number): string {
  return `SIAPAZAP2026${String(n).padStart(4, "0")}`;
}

/** Folio de teléfono con 9 dígitos. */
export function tel(n: number): string {
  return `116245${String(n).padStart(3, "0")}`;
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

/** Devuelve los datos o falla con un mensaje que dice qué operación se rechazó. */
export function ok<T>(r: Resultado<T>, que = "la operación"): T {
  if (!r.ok) {
    throw new Error(
      `${que}: se esperaba éxito y llegó ${r.error}${r.detalle ? ` (${r.detalle})` : ""}`,
    );
  }
  return r.datos;
}

/** Exige que la operación se rechace con exactamente ese código. */
export function rechaza(
  r: Resultado<unknown>,
  codigo: CodigoError,
  que = "la operación",
): void {
  if (r.ok) {
    throw new Error(`${que}: se esperaba ${codigo} y la operación tuvo éxito`);
  }
  expect(r.error, `${que}: código de error`).toBe(codigo);
}

// ---------------------------------------------------------------------------
// Folios
// ---------------------------------------------------------------------------

export async function registrar(
  { api, como }: Contexto,
  casa: string,
  codigo: string,
  reemplaza?: string,
): Promise<FolioVista> {
  await como(casa);
  return ok(
    await api.registrar_folio(codigo, reemplaza),
    `registrar ${codigo} (casa ${casa})`,
  );
}

export async function foliosDe(
  { api, como }: Contexto,
  casa: string,
): Promise<FolioVista[]> {
  await como(casa);
  return ok(await api.listar_folios_casa(), `listar folios (casa ${casa})`);
}

export async function folioDe(
  contexto: Contexto,
  casa: string,
  id: string,
): Promise<FolioVista> {
  const folio = (await foliosDe(contexto, casa)).find((f) => f.id === id);
  if (folio === undefined) {
    throw new Error(
      `el folio ${id} no aparece en listar_folios_casa (casa ${casa})`,
    );
  }
  return folio;
}

// ---------------------------------------------------------------------------
// Viajes
// ---------------------------------------------------------------------------

export async function abrir(
  { api, como }: Contexto,
  casa: string,
  datos: Partial<DatosAbrirViaje> = {},
): Promise<ViajeVista> {
  await como(casa);
  return ok(
    await api.abrir_viaje({
      proveedor: "Proveedor de prueba",
      minimo_casas: 3,
      ...datos,
      acepta_responsabilidad: true,
    }),
    `abrir viaje (casa ${casa})`,
  );
}

export async function anotar(
  { api, como }: Contexto,
  casa: string,
  viajeId: string,
): Promise<ViajeVista> {
  await como(casa);
  return ok(await api.anotarse(viajeId), `anotarse (casa ${casa})`);
}

/** Viaje tal como lo ve `casa` (o la sesión actual si no se indica). */
export async function ver(
  { api, como }: Contexto,
  id: string,
  casa?: string,
): Promise<ViajeVista> {
  if (casa !== undefined) {
    await como(casa);
  }
  const viaje = ok(await api.listar_viajes(), "listar viajes").find(
    (v) => v.id === id,
  );
  if (viaje === undefined) {
    throw new Error(`el viaje ${id} no aparece en listar_viajes`);
  }
  return viaje;
}

/** Viaje si aparece; `undefined` si ya no se lista (los cerrados pueden no listarse). */
export async function buscarViaje(
  { api }: Contexto,
  id: string,
): Promise<ViajeVista | undefined> {
  return ok(await api.listar_viajes(), "listar viajes").find(
    (v) => v.id === id,
  );
}

export async function pedir(
  { api, como }: Contexto,
  responsable: string,
  id: string,
  eta = "en ~2 h",
): Promise<ViajeVista> {
  await como(responsable);
  return ok(await api.marcar_pedida(id, eta), "marcar pedida");
}

export async function pasar(
  { api, como }: Contexto,
  responsable: string,
  id: string,
): Promise<ViajeVista> {
  await como(responsable);
  return ok(await api.marcar_ya_paso(id), "marcar ya pasó");
}

export async function confirmar(
  { api, como }: Contexto,
  casa: string,
  id: string,
  resultado: ResultadoEntrega,
): Promise<ViajeVista> {
  await como(casa);
  return ok(
    await api.confirmar_entrega(id, resultado),
    `confirmar ${resultado} (casa ${casa})`,
  );
}

export async function espera({ api, como }: Contexto, casa: string) {
  await como(casa);
  return ok(await api.listar_espera(), "listar espera");
}

export function casasEnOrden(viaje: ViajeVista): string[] {
  return viaje.anotaciones
    .filter((a) => a.estado === "anotada")
    .map((a) => a.casa_numero);
}

export function anotacionDe(viaje: ViajeVista, casa: string): AnotacionVista {
  const anotacion = viaje.anotaciones.find((a) => a.casa_numero === casa);
  if (anotacion === undefined) {
    throw new Error(`la casa ${casa} no aparece en las anotaciones del viaje`);
  }
  return anotacion;
}

export function esperaDe(lista: EsperaVista[], casa: string): EsperaVista {
  const fila = lista.find((e) => e.casa_numero === casa);
  if (fila === undefined) {
    throw new Error(
      `la casa ${casa} no está en la espera (hay: ${lista.map((e) => e.casa_numero).join(", ") || "nadie"})`,
    );
  }
  return fila;
}

export function ordenadas(casas: string[]): string[] {
  return [...casas].sort((a, b) => Number(a) - Number(b));
}

/**
 * Deja a `casa` en la espera con prioridad: un viaje de dos casas que ya pasó
 * y en el que `casa` marcó "pendiente". Absorbe a quien esté en la espera.
 */
export async function dejarPendiente(
  contexto: Contexto,
  responsable: string,
  casa: string,
): Promise<{ viaje: ViajeVista; antiguedad: number }> {
  const abierto = await abrir(contexto, responsable, { minimo_casas: 2 });
  const lleno = await anotar(contexto, casa, abierto.id);
  const antiguedad = anotacionDe(lleno, casa).antiguedad_desde;
  await pedir(contexto, responsable, abierto.id);
  await pasar(contexto, responsable, abierto.id);
  await confirmar(contexto, casa, abierto.id, "pendiente");
  await confirmar(contexto, responsable, abierto.id, "surtio");
  return { viaje: abierto, antiguedad };
}

// ---------------------------------------------------------------------------
// Bitácora e instantáneas
// ---------------------------------------------------------------------------

/** Toda la bitácora, del evento más antiguo al más reciente. */
export async function bitacoraCompleta(api: Api): Promise<EventoVista[]> {
  const limite = 200;
  const todos: EventoVista[] = [];
  let antes: number | undefined;
  for (let vuelta = 0; vuelta < 100; vuelta += 1) {
    const pagina = ok(await api.bitacora(antes, limite), "leer la bitácora");
    todos.push(...pagina);
    const ultimo = pagina[pagina.length - 1];
    if (pagina.length < limite || ultimo === undefined) {
      break;
    }
    if (antes !== undefined && ultimo.id >= antes) {
      break;
    }
    antes = ultimo.id;
  }
  return todos.sort((a, b) => a.id - b.id);
}

export async function ultimoEventoId(api: Api): Promise<number> {
  const eventos = await bitacoraCompleta(api);
  return eventos.length === 0 ? 0 : Math.max(...eventos.map((e) => e.id));
}

/** Eventos agregados después de `desdeId`, del más antiguo al más reciente. */
export async function eventosDespues(
  api: Api,
  desdeId: number,
): Promise<EventoVista[]> {
  return (await bitacoraCompleta(api)).filter((e) => e.id > desdeId);
}

/** Ejecuta `accion` y devuelve los eventos que dejó en la bitácora. */
export async function conEventos(
  api: Api,
  accion: () => Promise<unknown>,
): Promise<EventoVista[]> {
  const antes = await ultimoEventoId(api);
  await accion();
  return eventosDespues(api, antes);
}

export function tipos(eventos: EventoVista[]): string[] {
  return eventos.map((e) => e.tipo).sort();
}

/** Todo lo que un vecino puede leer, por casa, más la bitácora y (de coordinador) lo suyo. */
export async function instantanea(contexto: Contexto, casas: string[]) {
  const { api, como } = contexto;
  const porCasa: Record<string, unknown> = {};
  for (const casa of casas) {
    await como(casa);
    porCasa[casa] = {
      folios: ok(await api.listar_folios_casa(), "listar folios"),
      viajes: ok(await api.listar_viajes(), "listar viajes"),
      espera: ok(await api.listar_espera(), "listar espera"),
    };
  }
  const bitacora = await bitacoraCompleta(api);
  await como("coordinador");
  return {
    porCasa,
    bitacora,
    solicitudes: ok(await api.listar_solicitudes(), "listar solicitudes"),
    telefonos: ok(await api.listar_telefonos(), "listar teléfonos"),
  };
}

// ---------------------------------------------------------------------------
// Privacidad
// ---------------------------------------------------------------------------

const CLAVES_DE_TELEFONO =
  /^(?:telefono|numero_telefono|registrado_por|resuelta_por|creado_por|pin|pin_hash)$/;

/** Rutas donde la respuesta parece llevar un teléfono (valor o nombre de campo). */
export function buscarTelefonos(valor: unknown, ruta = "$"): string[] {
  if (typeof valor === "string") {
    return /\d{10}/.test(valor) ? [`${ruta} = "${valor}"`] : [];
  }
  if (typeof valor === "number") {
    return Number.isInteger(valor) && String(Math.abs(valor)).length === 10
      ? [`${ruta} = ${valor}`]
      : [];
  }
  if (Array.isArray(valor)) {
    return valor.flatMap((v, i) => buscarTelefonos(v, `${ruta}[${i}]`));
  }
  if (valor !== null && typeof valor === "object") {
    return Object.entries(valor).flatMap(([clave, v]) => [
      ...(CLAVES_DE_TELEFONO.test(clave) ? [`${ruta}.${clave} (campo)`] : []),
      ...buscarTelefonos(v, `${ruta}.${clave}`),
    ]);
  }
  return [];
}

/** Variantes con separadores de un teléfono ficticio del mundo de prueba. */
export function variantesDeTelefono(casa: string): string[] {
  const t = telefonoDe(casa);
  return [
    t,
    `${t.slice(0, 2)} ${t.slice(2, 6)} ${t.slice(6)}`,
    `${t.slice(0, 2)}-${t.slice(2, 6)}-${t.slice(6)}`,
  ];
}
