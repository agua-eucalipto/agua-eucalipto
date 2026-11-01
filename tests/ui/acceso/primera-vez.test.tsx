// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { PantallaInfo } from "../../../src/pantallas/info";
import { PrimeraVez } from "../../../src/pantallas/acceso";
import { CLAVE_PRIMERA_VEZ } from "../../../src/pantallas/acceso/estado";
import { acceso, info } from "../../../src/textos";
import { prepararDemo } from "./ayudas";

const aviso = acceso.aviso;
const tutorial = acceso.tutorial;

function boton(nombre: string) {
  return screen.getByRole("button", { name: nombre });
}

describe("AC-01 · aviso y tutorial solo la primera vez", () => {
  prepararDemo({ introduccionVista: false });

  it("muestra el aviso con el foco en «Entendido»", async () => {
    render(<PrimeraVez />);
    expect(
      await screen.findByRole("dialog", { name: aviso.titulo }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(boton(aviso.entendido));
    expect(screen.getByText(/no garantiza que te llegue agua/).tagName).toBe(
      "STRONG",
    );
  });

  it("el aviso no se cierra con Escape: hay que tocar «Entendido»", async () => {
    render(<PrimeraVez />);
    await screen.findByRole("dialog", { name: aviso.titulo });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: aviso.titulo })).toBeTruthy();
  });

  it("recorre las 4 tarjetas, empieza y ya no vuelve a salir", async () => {
    const { unmount } = render(<PrimeraVez />);
    await screen.findByRole("dialog", { name: aviso.titulo });
    fireEvent.click(boton(aviso.entendido));

    for (const [i, paso] of tutorial.pasos.entries()) {
      expect(await screen.findByText(paso.titulo)).toBeTruthy();
      expect(screen.getByText(tutorial.paso(i + 1, 4))).toBeTruthy();
      if (i < tutorial.pasos.length - 1) {
        fireEvent.click(boton(tutorial.siguiente));
      }
    }
    expect(screen.queryByRole("button", { name: tutorial.saltar })).toBeNull();
    fireEvent.click(boton(tutorial.empezar));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.localStorage.getItem(CLAVE_PRIMERA_VEZ)).toBe("1");

    unmount();
    render(<PrimeraVez />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("«Saltar» también cuenta como visto, y se puede volver atrás", async () => {
    render(<PrimeraVez />);
    fireEvent.click(
      await screen.findByRole("button", { name: aviso.entendido }),
    );
    fireEvent.click(boton(tutorial.siguiente));
    expect(screen.getByText(tutorial.pasos[1].titulo)).toBeTruthy();
    fireEvent.click(boton(tutorial.anterior));
    expect(screen.getByText(tutorial.pasos[0].titulo)).toBeTruthy();
    fireEvent.click(boton(tutorial.saltar));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.localStorage.getItem(CLAVE_PRIMERA_VEZ)).toBe("1");
  });

  it("se puede deslizar entre tarjetas", async () => {
    render(<PrimeraVez />);
    fireEvent.click(
      await screen.findByRole("button", { name: aviso.entendido }),
    );
    const tarjeta = screen.getByRole("group", { name: tutorial.paso(1, 4) });
    fireEvent.pointerDown(tarjeta, { clientX: 300 });
    fireEvent.pointerUp(tarjeta, { clientX: 100 });
    expect(screen.getByText(tutorial.pasos[1].titulo)).toBeTruthy();
    fireEvent.pointerDown(tarjeta, { clientX: 100 });
    fireEvent.pointerUp(tarjeta, { clientX: 300 });
    expect(screen.getByText(tutorial.pasos[0].titulo)).toBeTruthy();
  });

  it("sigue funcionando si el navegador no deja usar localStorage", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("sin almacenamiento");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("sin almacenamiento");
      });
    render(<PrimeraVez />);
    fireEvent.click(
      await screen.findByRole("button", { name: aviso.entendido }),
    );
    fireEvent.click(boton(tutorial.saltar));
    expect(screen.queryByRole("dialog")).toBeNull();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("AC-01 · desde ⓘ", () => {
  prepararDemo({ introduccionVista: true });

  it("no sale solo cuando ya se vio", () => {
    render(<PrimeraVez />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("«Ver el aviso y el tutorial otra vez» los muestra; Escape cierra y devuelve el foco", async () => {
    render(
      <>
        <PantallaInfo />
        <PrimeraVez />
      </>,
    );
    const abrir = boton(info.tutorial.boton);
    abrir.focus();
    fireEvent.click(abrir);

    expect(
      await screen.findByRole("dialog", { name: aviso.titulo }),
    ).toBeTruthy();
    fireEvent.click(boton(aviso.entendido));
    expect(await screen.findByText(tutorial.pasos[0].titulo)).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it("el foco da la vuelta con Tab dentro del diálogo", async () => {
    render(
      <>
        <PantallaInfo />
        <PrimeraVez />
      </>,
    );
    fireEvent.click(boton(info.tutorial.boton));
    fireEvent.click(
      await screen.findByRole("button", { name: aviso.entendido }),
    );
    await screen.findByText(tutorial.pasos[0].titulo);
    const dentro = screen.getByRole("dialog");
    const lista = Array.from(dentro.querySelectorAll<HTMLElement>("button"));
    lista[lista.length - 1]!.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(lista[0]);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lista[lista.length - 1]);
  });
});
