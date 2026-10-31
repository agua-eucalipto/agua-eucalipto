import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FolioVista,
  PerfilDemo,
  ViajeVista,
} from "../../src/api/contrato";
import { CLAVE_ESTADO, type ApiMemoria } from "../../src/api/memoria";
import { crearApiDemo, sembrar } from "../../src/demo";
import { HORA_MS } from "../../src/dominio";
import { ahora, reiniciar } from "../../src/reloj";

const INICIO = Date.UTC(2026, 10, 2, 16, 0, 0);
const COORDINADORAS = ["3", "18"];

async function como(api: ApiMemoria, casa: string): Promise<void> {
  const perfil: PerfilDemo = COORDINADORAS.includes(casa)
    ? "coordinador"
    : "vecino";
  const r = await api.demo_ver_como(perfil, casa);
  expect(r.ok).toBe(true);
}

async function foliosDe(api: ApiMemoria, casa: string) {
  await como(api, casa);
  const r = await api.listar_folios_casa();
  if (!r.ok) throw new Error(r.error);
  return new Map<string, FolioVista>(r.datos.map((f) => [f.codigo, f]));
}

async function viajes(api: ApiMemoria) {
  await como(api, "7");
  const r = await api.listar_viajes();
  if (!r.ok) throw new Error(r.error);
  return new Map<string, ViajeVista>(r.datos.map((v) => [v.proveedor, v]));
}

async function espera(api: ApiMemoria) {
  await como(api, "7");
  const r = await api.listar_espera();
  if (!r.ok) throw new Error(r.error);
  return r.datos;
}

const casasDe = (v: ViajeVista | undefined) =>
  (v?.anotaciones ?? []).map((a) => a.casa_numero);

async function nuevoDemo(): Promise<ApiMemoria> {
  return crearApiDemo({ almacenamiento: null });
}

async function adelantar(api: ApiMemoria, horas: number) {
  const r = await api.demo_adelantar_reloj(horas);
  expect(r.ok).toBe(true);
}

async function verificarT0(api: ApiMemoria) {
  const f7 = await foliosDe(api, "7");
  expect(f7.size).toBe(5);
  const hoy = f7.get("SIAPAZAP20261001");
  expect(hoy).toMatchObject({ estado: "activo", vence_hoy: true });
  expect(hoy?.vence_at).toBe(ahora() + 22 * HORA_MS);
  expect(f7.get("SIAPAZAP20260950")).toMatchObject({
    estado: "activo",
    puede_extender: false,
    vence_hoy: false,
  });
  expect(f7.get("SIAPAZAP20260950")?.vence_at).toBe(ahora() + 44 * HORA_MS);
  expect(f7.get("116245001")).toMatchObject({
    estado: "activo",
    dias_que_lleva: 1,
  });
  expect(f7.get("SIAPAZAP20260900")?.estado).toBe("surtido");
  expect(f7.get("116244000")).toMatchObject({ estado: "reemplazado" });
  expect(f7.get("116244000")?.cerrado_at).toBe(ahora() - 26 * HORA_MS);

  const f3 = await foliosDe(api, "3");
  expect(f3.get("116245010")).toMatchObject({
    estado: "activo",
    vence_hoy: true,
  });
  expect(f3.get("116245010")?.vence_at).toBe(ahora() + 12 * HORA_MS);
  expect(f3.get("SIAPAZAP20261010")?.estado).toBe("activo");

  const f4 = await foliosDe(api, "4");
  expect(f4.get("SIAPAZAP20260980")).toMatchObject({
    estado: "vencido",
    puede_extender: true,
  });
  expect((await foliosDe(api, "9")).get("116245020")?.estado).toBe("activo");
  const f12 = await foliosDe(api, "12");
  expect([...f12.values()].map((f) => f.estado)).toEqual(["activo", "activo"]);
  const f15 = await foliosDe(api, "15");
  expect(f15.get("SIAPAZAP20261030")).toMatchObject({
    estado: "activo",
    ultimo_envio_caseta_at: ahora() - 20 * HORA_MS,
  });
  expect((await foliosDe(api, "21")).get("116244900")).toMatchObject({
    estado: "vencido",
    puede_extender: false,
  });
  expect((await foliosDe(api, "22")).get("SIAPAZAP20260990")?.estado).toBe(
    "surtido",
  );
  // El WhatsApp de la casa 3 y el folio de la casa 9 son posteriores al envío.
  expect(f3.get("SIAPAZAP20261010")?.ultimo_envio_caseta_at).toBeNull();

  const v = await viajes(api);
  expect([...v.keys()].sort()).toEqual(
    ["Don Beto", "Pipas El Pozo", "Rubén 1", "Rubén 2"].sort(),
  );
  const ruben1 = v.get("Rubén 1");
  expect(ruben1).toMatchObject({
    estado: "juntando",
    responsable_casa: "12",
    precio_por_casa: 150,
    minimo_casas: 5,
    capacidad_aprox: 8,
    anotadas: 3,
    responsable_inactivo: false,
  });
  expect(casasDe(ruben1)).toEqual(["12", "14", "16"]);
  const pozo = v.get("Pipas El Pozo");
  expect(pozo).toMatchObject({
    estado: "lista",
    responsable_casa: "5",
    precio_por_casa: 180,
    anotadas: 6,
    responsable_inactivo: true,
  });
  expect(casasDe(pozo)).toEqual(["13", "5", "6", "8", "10", "11"]);
  expect(pozo?.anotaciones[0]?.con_prioridad).toBe(true);
  const beto = v.get("Don Beto");
  expect(beto).toMatchObject({
    estado: "pedida",
    responsable_casa: "19",
    capacidad_aprox: 6,
    eta_texto: "en ~2 h",
    pedido_at: ahora() - HORA_MS,
    anotadas: 7,
    puede_que_no_alcance: true,
  });
  expect(casasDe(beto)).toEqual(["19", "20", "23", "24", "25", "1", "17", "2"]);
  expect(beto?.anotaciones.at(-1)).toMatchObject({
    casa_numero: "2",
    estado: "baja_despues_de_pedida",
  });
  const ruben2 = v.get("Rubén 2");
  expect(ruben2).toMatchObject({
    estado: "ya_paso",
    responsable_casa: "22",
    paso_at: ahora() - 46 * HORA_MS,
  });
  const estados = new Map(
    (ruben2?.anotaciones ?? []).map((a) => [a.casa_numero, a.estado]),
  );
  expect(Object.fromEntries(estados)).toMatchObject({
    "22": "surtio",
    "15": "surtio",
    "21": "surtio",
    "13": "pendiente",
    "4": "pendiente",
    "9": "anotada",
  });

  const e = await espera(api);
  expect(e.map((x) => x.casa_numero)).toEqual(["4"]);
  expect(e[0]).toMatchObject({
    con_prioridad: true,
    origen: "pendiente",
    antiguedad_desde: ahora() - 60 * HORA_MS,
  });

  await como(api, "3");
  const s = await api.listar_solicitudes();
  if (!s.ok) throw new Error(s.error);
  expect(s.datos.map((x) => [x.telefono, x.casa_texto, x.motivo])).toEqual([
    ["5500000099", "Naranjo 8", "casa_fuera_de_catalogo"],
    ["5500000098", "Eucalipto 10", "telefono_fuera_de_lista"],
  ]);
  expect(s.datos.every((x) => x.estado === "pendiente")).toBe(true);
  const b = await api.bitacora(undefined, 500);
  if (!b.ok) throw new Error(b.error);
  expect(Math.max(...b.datos.map((x) => x.ocurrido_at))).toBeLessThanOrEqual(
    ahora(),
  );
  expect(b.datos.some((x) => x.tipo === "baja_despues_de_pedida")).toBe(true);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(INICIO);
  reiniciar();
});
afterEach(() => {
  vi.useRealTimers();
  reiniciar();
});

describe("semilla", () => {
  it("AC-01: corre sin errores de regla y deja el reloj en T0", async () => {
    const api = await nuevoDemo();
    expect(ahora()).toBe(INICIO);
    const r = await api.demo_ver_como("vecino");
    expect(r).toEqual({ ok: true, datos: { casa: "7", rol: "vecino" } });
  });

  it("falla con un mensaje claro si el guion rompe una regla", async () => {
    const api = await nuevoDemo();
    await expect(sembrar(api)).rejects.toThrow(
      /semilla: .*falló: FOLIO_YA_USADO/,
    );
  });

  it("AC-02 T0: coincide con las tablas de datos de ejemplo", async () => {
    await verificarT0(await nuevoDemo());
  });

  it("AC-02 T0: la lista de caseta del coordinador incluye los folios activos", async () => {
    const api = await nuevoDemo();
    await como(api, "3");
    const r = await api.generar_lista_caseta({
      canal: true,
      dias: true,
      formato: "imprimir",
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.datos.filas.map((f) => f.casa_numero)).toEqual([
      "3",
      "7",
      "9",
      "12",
      "15",
    ]);
  });

  it("AC-02 +1 día: vencen los folios de la casa 7 y la 3", async () => {
    const api = await nuevoDemo();
    await adelantar(api, 24);
    const f7 = await foliosDe(api, "7");
    expect(f7.get("SIAPAZAP20261001")).toMatchObject({
      estado: "vencido",
      puede_extender: true,
    });
    expect((await foliosDe(api, "3")).get("116245010")?.estado).toBe("vencido");
    await como(api, "3");
    const r = await api.generar_lista_caseta({
      canal: true,
      dias: true,
      formato: "whatsapp",
    });
    if (!r.ok) throw new Error(r.error);
    const codigos = r.datos.filas.flatMap((f) => f.folios.map((x) => x.codigo));
    expect(codigos).not.toContain("SIAPAZAP20261001");
    expect(codigos).not.toContain("116245010");
    await como(api, "7");
    const ext = await api.marcar_sigue_pendiente(
      f7.get("SIAPAZAP20261001")?.id ?? "",
    );
    expect(ext.ok).toBe(true);
    const otra = await api.marcar_sigue_pendiente(
      f7.get("SIAPAZAP20261001")?.id ?? "",
    );
    expect(otra).toMatchObject({ ok: false, error: "YA_EXTENDIDO" });
  });

  it("AC-02 +2 días: se cierran El Pozo y Don Beto, pasan a espera y casa 9 queda sin confirmar", async () => {
    const api = await nuevoDemo();
    await adelantar(api, 48);
    const v = await viajes(api);
    expect([...v.keys()]).toEqual(["Rubén 1"]);
    const e = await espera(api);
    const casas = e.map((x) => x.casa_numero);
    expect(casas.slice(0, 2)).toEqual(["4", "13"]);
    expect(new Set(casas)).toEqual(
      new Set([
        "4",
        "13",
        "5",
        "6",
        "8",
        "10",
        "11",
        "19",
        "20",
        "23",
        "24",
        "25",
        "1",
        "17",
      ]),
    );
    expect(e.find((x) => x.casa_numero === "13")?.con_prioridad).toBe(true);
    expect((await foliosDe(api, "7")).get("SIAPAZAP20260950")?.estado).toBe(
      "vencido",
    );
    await como(api, "3");
    const b = await api.bitacora(undefined, 500);
    if (!b.ok) throw new Error(b.error);
    expect(b.datos.filter((x) => x.tipo === "viaje_cerrado_72h")).toHaveLength(
      2,
    );
  });

  it("AC-02: a las 26 h la casa 9 queda sin confirmar en Rubén 2", async () => {
    const api = await nuevoDemo();
    await adelantar(api, 25);
    const antes = (await viajes(api)).get("Rubén 2");
    expect(antes?.anotaciones.find((a) => a.casa_numero === "9")).toMatchObject(
      {
        sin_confirmar: false,
      },
    );
    await adelantar(api, 1);
    const despues = (await viajes(api)).get("Rubén 2");
    expect(
      despues?.anotaciones.find((a) => a.casa_numero === "9")?.sin_confirmar,
    ).toBe(true);
  });

  it("AC-02 +3 días: se cierra Rubén 1 y la casa 4 ya no puede extender", async () => {
    const api = await nuevoDemo();
    await adelantar(api, 48);
    expect(
      (await foliosDe(api, "4")).get("SIAPAZAP20260980")?.puede_extender,
    ).toBe(true);
    await adelantar(api, 24);
    const v = await viajes(api);
    expect([...v.keys()]).toEqual([]);
    expect((await espera(api)).some((x) => x.casa_numero === "12")).toBe(true);
    const f4 = (await foliosDe(api, "4")).get("SIAPAZAP20260980");
    expect(f4).toMatchObject({ estado: "vencido", puede_extender: false });
    const r = await api.marcar_sigue_pendiente(f4?.id ?? "");
    expect(r).toMatchObject({ ok: false, error: "FUERA_DE_PLAZO" });
  });

  it("AC-03: reiniciar produce un T0 nuevo", async () => {
    const api = await nuevoDemo();
    await adelantar(api, 72);
    await como(api, "7");
    const registro = await api.registrar_folio("116249999");
    expect(registro.ok).toBe(true);
    vi.setSystemTime(INICIO + 10 * 24 * HORA_MS);
    const r = await api.demo_reiniciar();
    expect(r.ok).toBe(true);
    expect(ahora()).toBe(INICIO + 10 * 24 * HORA_MS);
    expect((await foliosDe(api, "7")).has("116249999")).toBe(false);
    await verificarT0(api);
  });

  it("conserva el estado guardado al recargar y no vuelve a sembrar", async () => {
    const datos = new Map<string, string>();
    const almacenamiento = {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    };
    const primera = await crearApiDemo({ almacenamiento });
    await como(primera, "7");
    await primera.registrar_folio("116249998");
    const segunda = await crearApiDemo({ almacenamiento });
    expect((await foliosDe(segunda, "7")).has("116249998")).toBe(true);
  });

  it("siembra si lo guardado no es un estado válido", async () => {
    const almacenamiento = {
      getItem: (k: string) => (k === CLAVE_ESTADO ? "{no es json" : null),
      setItem: () => undefined,
    };
    const api = await crearApiDemo({ almacenamiento });
    expect((await foliosDe(api, "7")).size).toBe(5);
  });
});
