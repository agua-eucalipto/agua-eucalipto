import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiMemoria } from "../../src/api/memoria";
import { CLAVE_ESTADO, type Almacen } from "../../src/api/memoria/persistencia";
import { fotoParaMemoria } from "../../src/api/memoria/foto";
import type { NivelAljibe, Resultado } from "../../src/api/contrato";
import { DIA_MS } from "../../src/dominio";
import * as reloj from "../../src/reloj";
import { jpegConExif, jpegSinExif, textoExif } from "./jpeg";

function datos<T>(r: Resultado<T>): T {
  if (!r.ok) throw new Error(`se esperaba éxito y llegó ${r.error}`);
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

const AHORA = new Date(2026, 10, 1, 15, 0, 0).getTime();

beforeEach(() => {
  reloj.fijar(AHORA);
});

afterEach(() => {
  reloj.reiniciar();
});

describe("nivel del aljibe", () => {
  it("guarda el nivel con la hora del reloj del demo y sin marcas si no hay foto", async () => {
    const api = new ApiMemoria({ almacenamiento: null });
    datos(await api.demo_ver_como("vecino", "7"));
    expect(datos(await api.mi_reporte_aljibe())).toBeNull();
    const reporte = datos(await api.reportar_nivel_aljibe("medio"));
    expect(reporte).toMatchObject({
      casa_numero: "7",
      nivel: "medio",
      reportado_at: AHORA,
      marcas: [],
      camara: null,
      foto_url: null,
    });
    expect(datos(await api.mi_reporte_aljibe())?.nivel).toBe("medio");
  });

  it("marca foto repetida, antigua, sin fecha, y no marca una de hace 24 h justas", async () => {
    const api = new ApiMemoria({ almacenamiento: null });
    const antigua = jpegConExif({
      fecha: textoExif(AHORA - DIA_MS - 1000),
      fabricante: "ACME",
      modelo: "X1",
    });
    const justa = jpegConExif({ fecha: textoExif(AHORA - DIA_MS) });
    const fresca = jpegConExif({
      fecha: textoExif(AHORA - DIA_MS + 1000),
      fabricante: "ACME",
      modelo: "X1",
    });
    const sinFecha = jpegSinExif();

    datos(await api.demo_ver_como("vecino", "7"));
    const primera = datos(
      await api.reportar_nivel_aljibe("bajo", {
        bytes: antigua,
        tipo: "image/jpeg",
      }),
    );
    expect(primera.marcas).toEqual(["foto_antigua"]);
    expect(primera.camara).toBe("ACME X1");
    expect(primera.foto_url?.startsWith("data:image/jpeg;base64,")).toBe(true);

    const repetida = datos(
      await api.reportar_nivel_aljibe("vacio", {
        bytes: antigua,
        tipo: "image/jpeg",
      }),
    );
    expect(repetida.marcas).toEqual(["foto_repetida", "foto_antigua"]);

    datos(await api.demo_ver_como("vecino", "10"));
    const otraCasa = datos(
      await api.reportar_nivel_aljibe("lleno", {
        bytes: fresca,
        tipo: "image/jpeg",
      }),
    );
    expect(otraCasa.marcas).toEqual([]);
    expect(otraCasa.camara).toBe("ACME X1");

    datos(await api.demo_ver_como("vecino", "2"));
    expect(
      datos(
        await api.reportar_nivel_aljibe("medio", {
          bytes: justa,
          tipo: "image/jpeg",
        }),
      ).marcas,
    ).toEqual([]);

    datos(await api.demo_ver_como("vecino", "8"));
    expect(
      datos(
        await api.reportar_nivel_aljibe("bajo", {
          bytes: sinFecha,
          tipo: "image/jpeg",
        }),
      ).marcas,
    ).toEqual(["sin_fecha"]);

    datos(await api.demo_ver_como("vecino", "4"));
    expect(
      datos(
        await api.reportar_nivel_aljibe("medio", {
          bytes: fresca,
          tipo: "image/jpeg",
        }),
      ).marcas,
    ).toEqual(["foto_repetida"]);
  });

  it("la coordinación ve casa, nivel y marcas; un vecino no puede listar", async () => {
    const api = new ApiMemoria({ almacenamiento: null });
    datos(await api.demo_ver_como("vecino", "10"));
    datos(await api.reportar_nivel_aljibe("lleno"));
    datos(await api.demo_ver_como("vecino", "2"));
    datos(
      await api.reportar_nivel_aljibe("vacio", {
        bytes: jpegSinExif(),
        tipo: "image/jpeg",
      }),
    );
    const comoVecino = await api.listar_aljibes();
    expect(comoVecino.ok).toBe(false);
    if (!comoVecino.ok) expect(comoVecino.error).toBe("NO_AUTORIZADO");

    datos(await api.demo_ver_como("coordinador"));
    const lista = datos(await api.listar_aljibes());
    expect(lista.map((r) => r.casa_numero)).toEqual(["2", "10"]);
    expect(lista[0]).toMatchObject({
      nivel: "vacio",
      marcas: ["sin_fecha"],
    });
    expect(lista[1]?.nivel).toBe("lleno");
    expect(JSON.stringify(lista)).not.toContain("data:");
  });

  it("sin casa rechaza el reporte, y un nivel desconocido también", async () => {
    const api = new ApiMemoria({ almacenamiento: null });
    expect(await api.reportar_nivel_aljibe("medio")).toMatchObject({
      ok: false,
      error: "NO_AUTORIZADO",
    });
    expect(await api.mi_reporte_aljibe()).toMatchObject({
      ok: false,
      error: "NO_AUTORIZADO",
    });
    datos(await api.demo_ver_como("vecino", "7"));
    expect(
      await api.reportar_nivel_aljibe("otro" as NivelAljibe),
    ).toMatchObject({ ok: false, error: "DATOS_INVALIDOS" });
  });

  it("la bandera se recuerda en la sesión y Reiniciar la apaga, con la foto", async () => {
    const almacen = new AlmacenEnMemoria();
    const api = new ApiMemoria({ almacenamiento: almacen });
    expect(datos(await api.demo_mostrar_aljibe())).toBe(false);
    datos(await api.demo_fijar_aljibe(true));
    datos(await api.demo_ver_como("vecino", "7"));
    const reporte = datos(
      await api.reportar_nivel_aljibe("medio", {
        bytes: jpegSinExif(),
        tipo: "image/jpeg",
      }),
    );
    expect(reporte.foto_url).not.toBeNull();
    const guardado = almacen.getItem(CLAVE_ESTADO) ?? "";
    expect(guardado).not.toContain("data:");
    expect(JSON.parse(guardado).mostrar_aljibe).toBe(true);

    reloj.fijar(AHORA);
    const recargada = new ApiMemoria({ almacenamiento: almacen });
    expect(datos(await recargada.demo_mostrar_aljibe())).toBe(true);
    datos(await recargada.demo_ver_como("vecino", "7"));
    const otraVez = datos(await recargada.mi_reporte_aljibe());
    expect(otraVez?.nivel).toBe("medio");
    expect(otraVez?.marcas).toEqual(["sin_fecha"]);
    expect(otraVez?.foto_url).toBeNull();

    datos(await recargada.demo_reiniciar());
    expect(datos(await recargada.demo_mostrar_aljibe())).toBe(false);
    datos(await recargada.demo_ver_como("vecino", "7"));
    expect(datos(await recargada.mi_reporte_aljibe())).toBeNull();
  });

  it("un estado guardado de antes sigue, con la bandera apagada", async () => {
    const almacen = new AlmacenEnMemoria();
    const api = new ApiMemoria({ almacenamiento: almacen });
    datos(await api.demo_ver_como("vecino", "7"));
    const json = JSON.parse(almacen.getItem(CLAVE_ESTADO) ?? "{}") as Record<
      string,
      unknown
    >;
    delete json.mostrar_aljibe;
    delete json.reportes_aljibe;
    delete json.huellas_foto;
    almacen.setItem(CLAVE_ESTADO, JSON.stringify(json));
    const recargada = new ApiMemoria({ almacenamiento: almacen });
    expect(datos(await recargada.demo_mostrar_aljibe())).toBe(false);
    datos(await recargada.demo_ver_como("vecino", "7"));
    expect(datos(await recargada.mi_reporte_aljibe())).toBeNull();
  });
});

describe("foto en memoria", () => {
  it("guarda un JPEG chico y no guarda uno que pasa de unos 200 KB", async () => {
    const chica = await fotoParaMemoria(jpegSinExif(), "image/jpeg");
    expect(chica?.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect((chica ?? "").length).toBeLessThanOrEqual(200 * 1024);
    const grande = new Uint8Array(180 * 1024);
    grande[0] = 0xff;
    grande[1] = 0xd8;
    expect(await fotoParaMemoria(grande, "image/jpeg")).toBeNull();
  });
});
