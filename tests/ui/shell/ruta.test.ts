// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { irAInicio, rutaDeHash, subrutaDeHash } from "../../../src/app/ruta";

describe("rutas por hash", () => {
  it("separa la pantalla de su subruta", () => {
    expect(rutaDeHash("#pipas/12/editar")).toBe("pipas");
    expect(subrutaDeHash("#pipas/12/editar")).toBe("12/editar");
    expect(rutaDeHash("#pipas/abrir")).toBe("pipas");
    expect(subrutaDeHash("#pipas")).toBe("");
    expect(subrutaDeHash("#pipas/")).toBe("");
  });

  it("deja igual las rutas sin subruta", () => {
    expect(rutaDeHash("")).toBe("siapa");
    expect(rutaDeHash("#info")).toBe("info");
    expect(rutaDeHash("#no-existe")).toBeNull();
    expect(rutaDeHash("#no-existe/1")).toBeNull();
  });

  it("irAInicio reemplaza la entrada actual por la pantalla inicial", () => {
    window.history.pushState(null, "", "#coordinador");
    const antes = window.history.length;
    let avisos = 0;
    const alCambiar = () => avisos++;
    window.addEventListener("hashchange", alCambiar);
    irAInicio();
    window.removeEventListener("hashchange", alCambiar);
    expect(window.location.hash).toBe("#siapa");
    expect(window.history.length).toBe(antes);
    expect(avisos).toBe(1);
  });
});
