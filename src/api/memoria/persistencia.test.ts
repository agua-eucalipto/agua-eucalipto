import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as reloj from "../../reloj";
import type { Resultado } from "../contrato";
import { ApiMemoria } from "./api";
import { CLAVE_ESTADO, type Almacen } from "./persistencia";

const T0 = Date.UTC(2026, 10, 2, 16, 0, 0);
const HORA = 60 * 60 * 1000;

function datos<T>(r: Resultado<T>): T {
  if (!r.ok) {
    throw new Error(`se esperaba éxito y llegó ${r.error}`);
  }
  return r.datos;
}

class AlmacenEnMemoria implements Almacen {
  readonly valores = new Map<string, string>();
  getItem(clave: string): string | null {
    return this.valores.get(clave) ?? null;
  }
  setItem(clave: string, valor: string): void {
    this.valores.set(clave, valor);
  }
}

/** Como `localStorage` en modo privado: cualquier acceso lanza. */
const almacenBloqueado: Almacen = {
  getItem() {
    throw new DOMException("bloqueado", "SecurityError");
  },
  setItem() {
    throw new DOMException("bloqueado", "SecurityError");
  },
};

/** Una sesión corta de uso: un folio, un viaje y una casa anotada. */
async function usar(api: ApiMemoria) {
  datos(await api.demo_ver_como("vecino", "7"));
  const folio = datos(await api.registrar_folio("SIAPAZAP20260001"));
  const viaje = datos(
    await api.abrir_viaje({
      proveedor: "Rubén 1",
      minimo_casas: 2,
      acepta_responsabilidad: true,
    }),
  );
  datos(await api.demo_ver_como("vecino", "8"));
  datos(await api.anotarse(viaje.id));
  return { folio, viaje };
}

async function foto(api: ApiMemoria) {
  return {
    sesion: datos(await api.sesion_actual()),
    viajes: datos(await api.listar_viajes()),
    espera: datos(await api.listar_espera()),
    bitacora: datos(await api.bitacora(undefined, 500)),
  };
}

beforeEach(() => reloj.fijar(T0));
afterEach(() => reloj.reiniciar());

describe("persistencia del adaptador en memoria", () => {
  it("recargar la página conserva el estado y la sesión", async () => {
    const almacen = new AlmacenEnMemoria();
    const antes = new ApiMemoria({ almacenamiento: almacen });
    const { folio } = await usar(antes);
    expect(antes.persistente).toBe(true);
    expect(almacen.getItem(CLAVE_ESTADO)).not.toBeNull();
    const esperado = await foto(antes);

    const recargada = new ApiMemoria({ almacenamiento: almacen });
    expect(await foto(recargada)).toEqual(esperado);
    datos(await recargada.demo_ver_como("vecino", "7"));
    expect(datos(await recargada.listar_folios_casa())).toEqual([
      expect.objectContaining({ id: folio.id, codigo: "SIAPAZAP20260001" }),
    ]);
  });

  it("lo guardado no lleva PIN", async () => {
    const almacen = new AlmacenEnMemoria();
    const api = new ApiMemoria({ almacenamiento: almacen });
    datos(await api.ingresar("5500000007", "4321", "7"));
    expect(almacen.getItem(CLAVE_ESTADO)).not.toContain("4321");
  });

  it("un rechazo no toca lo guardado", async () => {
    const almacen = new AlmacenEnMemoria();
    const api = new ApiMemoria({ almacenamiento: almacen });
    await usar(api);
    const guardado = almacen.getItem(CLAVE_ESTADO);
    const r = await api.registrar_folio("SIAPAZAP20260001");
    expect(r).toMatchObject({ ok: false, error: "FOLIO_YA_USADO" });
    expect(almacen.getItem(CLAVE_ESTADO)).toBe(guardado);
  });

  it("al recargar, el reloj adelantado del demo sigue adelantado", async () => {
    const almacen = new AlmacenEnMemoria();
    const api = new ApiMemoria({ almacenamiento: almacen });
    datos(await api.demo_ver_como("vecino", "7"));
    expect(datos(await api.demo_adelantar_reloj(48)).ahora).toBe(
      T0 + 48 * HORA,
    );

    reloj.fijar(T0);
    const recargada = new ApiMemoria({ almacenamiento: almacen });
    expect(reloj.ahora()).toBe(T0 + 48 * HORA);
    const eventos = datos(await recargada.bitacora());
    expect(eventos[0]).toMatchObject({ tipo: "demo_reloj_adelantado" });
  });

  it("ignora datos de otra versión o dañados", async () => {
    for (const texto of ['{"version":0}', "no es json"]) {
      const almacen = new AlmacenEnMemoria();
      almacen.setItem(CLAVE_ESTADO, texto);
      const api = new ApiMemoria({ almacenamiento: almacen });
      datos(await api.demo_ver_como("vecino", "7"));
      expect(datos(await api.listar_viajes())).toEqual([]);
      expect(datos(await api.bitacora())).toEqual([]);
    }
  });

  it("con el almacenamiento bloqueado funciona en memoria", async () => {
    const api = new ApiMemoria({ almacenamiento: almacenBloqueado });
    const { viaje } = await usar(api);
    expect(api.persistente).toBe(false);
    datos(await api.demo_ver_como("vecino", "7"));
    expect(datos(await api.listar_folios_casa())).toHaveLength(1);
    expect(datos(await api.listar_viajes())).toEqual([
      expect.objectContaining({ id: viaje.id, anotadas: 2, estado: "lista" }),
    ]);
  });

  it("si guardar falla a media sesión, sigue en memoria sin perder nada", async () => {
    const almacen = new AlmacenEnMemoria();
    const api = new ApiMemoria({ almacenamiento: almacen });
    datos(await api.demo_ver_como("vecino", "7"));
    almacen.setItem = () => {
      throw new DOMException("lleno", "QuotaExceededError");
    };
    await usar(api);
    expect(api.persistente).toBe(false);
    datos(await api.demo_ver_como("vecino", "8"));
    expect(datos(await api.listar_viajes())).toHaveLength(1);
  });

  it("sin localStorage accesible en el navegador, arranca en memoria", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("bloqueado", "SecurityError");
      },
    });
    try {
      const api = new ApiMemoria();
      expect(api.persistente).toBe(false);
      await usar(api);
      expect(datos(await api.listar_viajes())).toHaveLength(1);
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, "localStorage");
      } else {
        Object.defineProperty(globalThis, "localStorage", descriptor);
      }
    }
  });
});
