import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adelantar, ahora, fijar, reiniciar } from "../../src/reloj";

const BASE = Date.UTC(2026, 10, 2, 9, 0, 0);
const DIA_MS = 24 * 60 * 60 * 1000;

describe("reloj", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
    reiniciar();
  });

  afterEach(() => {
    reiniciar();
    vi.useRealTimers();
  });

  it("sigue la hora del sistema mientras no se toque", () => {
    expect(ahora()).toBe(BASE);
    vi.setSystemTime(BASE + 5000);
    expect(ahora()).toBe(BASE + 5000);
  });

  it("adelantar mueve el reloj y el desfase se acumula", () => {
    adelantar(DIA_MS);
    expect(ahora()).toBe(BASE + DIA_MS);
    adelantar(DIA_MS);
    expect(ahora()).toBe(BASE + 2 * DIA_MS);
    vi.setSystemTime(BASE + 1000);
    expect(ahora()).toBe(BASE + 1000 + 2 * DIA_MS);
  });

  it("fijar detiene el reloj en un instante", () => {
    fijar(123456);
    vi.setSystemTime(BASE + 99999);
    expect(ahora()).toBe(123456);
  });

  it("con el reloj fijo, adelantar mueve el instante fijo", () => {
    fijar(1000);
    adelantar(500);
    expect(ahora()).toBe(1500);
  });

  it("reiniciar vuelve a la hora del sistema", () => {
    adelantar(DIA_MS);
    fijar(1);
    reiniciar();
    expect(ahora()).toBe(BASE);
  });
});
