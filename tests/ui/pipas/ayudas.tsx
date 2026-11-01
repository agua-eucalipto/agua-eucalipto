import { act, cleanup, render, screen, within } from "@testing-library/preact";
import { afterEach, beforeEach } from "vitest";
import { PantallaPipas } from "../../../src/pantallas/pipas";
import { iniciarNavegacion } from "../../../src/app/ruta";
import * as servicios from "../../../src/app/servicios";

/**
 * Cada prueba arranca con los datos de ejemplo, como vecino de la casa 7, y
 * el reloj real. `localStorage` se limpia para que no se herede nada.
 */
export function prepararDemo() {
  let detener = () => {};
  beforeEach(async () => {
    window.location.hash = "#pipas";
    detener = iniciarNavegacion();
    localStorage.clear();
    await servicios.iniciarApi();
    await servicios.apiDemo.demo_reiniciar();
    await servicios.verComo("vecino", "7");
  });
  afterEach(() => {
    cleanup();
    detener();
    localStorage.clear();
  });
}

/** Pinta la pantalla y espera a que lleguen los datos. */
export async function montar() {
  render(<PantallaPipas />);
  await screen.findByRole("region", { name: "Mi situación" });
}

export function situacion() {
  return screen.getByRole("region", { name: "Mi situación" });
}

export function tarjeta(proveedor: string) {
  return screen.getByRole("article", { name: `Viaje ${proveedor}` });
}

export function boton(dentro: HTMLElement | Screen, nombre: string | RegExp) {
  return within(dentro as HTMLElement).getByRole("button", { name: nombre });
}

type Screen = typeof screen;

/** Cambia de casa como lo hace la barra de demo. */
export async function comoCasa(casa: string) {
  await act(async () => {
    await servicios.verComo("vecino", casa);
  });
  await screen.findByRole("region", { name: "Mi situación" });
}

export async function adelantarDias(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      await servicios.adelantarUnDia();
    });
  }
}

export { servicios };
