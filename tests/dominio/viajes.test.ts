import { describe, expect, it } from "vitest";
import { estadoViaje, ordenarAnotaciones } from "../../src/dominio";
import type { AnotacionOrdenable, ViajeTiempos } from "../../src/dominio";

function viaje(cambios: Partial<ViajeTiempos> = {}): ViajeTiempos {
  return {
    minimo_casas: 5,
    pedido_at: null,
    paso_at: null,
    cerrado_sin_completar_at: null,
    ...cambios,
  };
}

describe("P-04 e I-07 estadoViaje", () => {
  it("juntando mientras falten casas y lista al llegar al mínimo", () => {
    expect(estadoViaje(viaje(), 0)).toBe("juntando");
    expect(estadoViaje(viaje(), 4)).toBe("juntando");
    expect(estadoViaje(viaje(), 5)).toBe("lista");
    expect(estadoViaje(viaje(), 9)).toBe("lista");
  });

  it("regresa a juntando si las bajas lo dejan bajo el mínimo", () => {
    expect(estadoViaje(viaje(), 5)).toBe("lista");
    expect(estadoViaje(viaje(), 4)).toBe("juntando");
  });

  it("respeta un mínimo distinto", () => {
    expect(estadoViaje(viaje({ minimo_casas: 1 }), 1)).toBe("lista");
    expect(estadoViaje(viaje({ minimo_casas: 30 }), 29)).toBe("juntando");
  });

  it("pedida, ya pasó y cerrado mandan sobre el conteo", () => {
    expect(estadoViaje(viaje({ pedido_at: 10 }), 0)).toBe("pedida");
    expect(estadoViaje(viaje({ pedido_at: 10, paso_at: 20 }), 0)).toBe(
      "ya_paso",
    );
    expect(
      estadoViaje(viaje({ pedido_at: 10, cerrado_sin_completar_at: 30 }), 9),
    ).toBe("cerrado");
    expect(
      estadoViaje(viaje({ paso_at: 20, cerrado_sin_completar_at: 30 }), 9),
    ).toBe("cerrado");
  });
});

interface Fila extends AnotacionOrdenable {
  casa: string;
}

function fila(casa: string, cambios: Partial<AnotacionOrdenable> = {}): Fila {
  return {
    casa,
    estado: "anotada",
    con_prioridad: false,
    antiguedad_desde: 1000,
    anotada_at: 1000,
    ...cambios,
  };
}

describe("P-03 ordenarAnotaciones", () => {
  it("pone primero a las casas con prioridad", () => {
    const orden = ordenarAnotaciones([
      fila("1", { antiguedad_desde: 10 }),
      fila("2", { con_prioridad: true, antiguedad_desde: 500 }),
    ]);
    expect(orden.map((a) => a.casa)).toEqual(["2", "1"]);
  });

  it("dentro del mismo grupo, la más antigua esperando va primero", () => {
    const orden = ordenarAnotaciones([
      fila("1", { antiguedad_desde: 300 }),
      fila("2", { antiguedad_desde: 100 }),
      fila("3", { antiguedad_desde: 200 }),
    ]);
    expect(orden.map((a) => a.casa)).toEqual(["2", "3", "1"]);
  });

  it("en empate de antigüedad decide quién se anotó antes", () => {
    const orden = ordenarAnotaciones([
      fila("1", { anotada_at: 30 }),
      fila("2", { anotada_at: 10 }),
      fila("3", { anotada_at: 20 }),
    ]);
    expect(orden.map((a) => a.casa)).toEqual(["2", "3", "1"]);
  });

  it("combina prioridad, antigüedad y hora de anotación", () => {
    const orden = ordenarAnotaciones([
      fila("1", { antiguedad_desde: 50 }),
      fila("2", { con_prioridad: true, antiguedad_desde: 90 }),
      fila("3", { con_prioridad: true, antiguedad_desde: 40, anotada_at: 9 }),
      fila("4", { con_prioridad: true, antiguedad_desde: 40, anotada_at: 5 }),
    ]);
    expect(orden.map((a) => a.casa)).toEqual(["4", "3", "2", "1"]);
  });

  it("ignora lo que no está anotado", () => {
    const orden = ordenarAnotaciones([
      fila("1", { estado: "baja" }),
      fila("2"),
      fila("3", { estado: "baja_despues_de_pedida" }),
      fila("4", { estado: "movida_a_espera" }),
    ]);
    expect(orden.map((a) => a.casa)).toEqual(["2"]);
  });

  it("no modifica el arreglo original", () => {
    const original = [
      fila("1", { antiguedad_desde: 9 }),
      fila("2", { antiguedad_desde: 1 }),
    ];
    ordenarAnotaciones(original);
    expect(original.map((a) => a.casa)).toEqual(["1", "2"]);
  });
});
