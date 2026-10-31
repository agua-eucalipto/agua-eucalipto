import { describe, expect, it } from "vitest";
import { ordenCasa } from "../../src/dominio";

describe("ordenCasa", () => {
  it("ordena de forma numérica: 2 antes que 10", () => {
    const orden = ["10", "2", "25", "1"].sort(
      (a, b) => ordenCasa(a)! - ordenCasa(b)!,
    );
    expect(orden).toEqual(["1", "2", "10", "25"]);
  });

  it("pone las casas con letra después de la numérica", () => {
    expect(ordenCasa("12")!).toBeLessThan(ordenCasa("12-A")!);
    expect(ordenCasa("12-A")!).toBeLessThan(ordenCasa("12-B")!);
    expect(ordenCasa("12-B")!).toBeLessThan(ordenCasa("13")!);
  });

  it("admite letra sin guion, minúsculas y espacios alrededor", () => {
    expect(ordenCasa("12a")).toBe(ordenCasa("12-A"));
    expect(ordenCasa("  7 ")).toBe(700);
  });

  it("devuelve null si no es un número de casa", () => {
    expect(ordenCasa("")).toBeNull();
    expect(ordenCasa("Naranjo")).toBeNull();
    expect(ordenCasa("A12")).toBeNull();
    expect(ordenCasa("12-AB")).toBeNull();
  });
});
