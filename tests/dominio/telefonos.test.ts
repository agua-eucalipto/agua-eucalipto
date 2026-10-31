import { describe, expect, it } from "vitest";
import { normalizarTelefono } from "../../src/dominio";

describe("normalizarTelefono", () => {
  it("deja solo los 10 dígitos", () => {
    expect(normalizarTelefono("3312345678")).toBe("3312345678");
    expect(normalizarTelefono("(33) 1234-5678")).toBe("3312345678");
    expect(normalizarTelefono(" 33 1234 5678 ")).toBe("3312345678");
  });

  it("acepta la lada de México", () => {
    expect(normalizarTelefono("+52 33 1234 5678")).toBe("3312345678");
    expect(normalizarTelefono("+52 1 33 1234 5678")).toBe("3312345678");
  });

  it("rechaza lo que no resulta en 10 dígitos", () => {
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono("abc")).toBeNull();
    expect(normalizarTelefono("331234567")).toBeNull();
    expect(normalizarTelefono("33123456789")).toBeNull();
    expect(normalizarTelefono("+1 33 1234 5678")).toBeNull();
  });
});
