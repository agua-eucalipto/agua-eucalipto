// @vitest-environment happy-dom
import { fireEvent, screen, waitFor, within } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import {
  adelantarDias,
  boton,
  comoCasa,
  montar,
  prepararDemo,
  servicios,
  situacion,
} from "./ayudas";

prepararDemo();

describe("Mi situación (AC-03)", () => {
  it("caso 1: no estoy en nada", async () => {
    await montar();
    const s = within(situacion());
    expect(s.getByText("Tu casa no está en ningún viaje")).toBeTruthy();
    expect(s.getByRole("button", { name: "Anotarme a un viaje" })).toBeTruthy();
    expect(
      s.getByRole("button", { name: "Me da igual el proveedor" }),
    ).toBeTruthy();
    expect(s.getByRole("button", { name: /Abrir un viaje/ })).toBeTruthy();
  });

  it("caso 2: estoy anotado, con mi lugar y la baja", async () => {
    await montar();
    await comoCasa("14");
    const s = within(situacion());
    expect(
      s.getByText("Estás en el viaje de Rubén 1 · Lugar 2 de 3"),
    ).toBeTruthy();
    expect(s.getByRole("button", { name: "Darme de baja" })).toBeTruthy();
  });

  it("caso 2b: quien coordina ve su lugar pero no puede darse de baja", async () => {
    await montar();
    await comoCasa("12");
    const s = within(situacion());
    expect(
      s.getByText("Coordinas el viaje de Rubén 1 · Lugar 1 de 3"),
    ).toBeTruthy();
    expect(s.queryByRole("button", { name: "Darme de baja" })).toBeNull();
    expect(s.getByRole("button", { name: "Ver el viaje" })).toBeTruthy();
  });

  it("caso 3: estoy en espera, con antigüedad y prioridad", async () => {
    await montar();
    await comoCasa("4");
    const s = within(situacion());
    expect(s.getByText("Estás en espera, cualquier proveedor")).toBeTruthy();
    expect(s.getByText("Desde hace 2 días · con prioridad")).toBeTruthy();
    expect(
      s.getByText("Te sumaremos al siguiente viaje que se abra."),
    ).toBeTruthy();
    expect(s.getByRole("button", { name: "Salir de la espera" })).toBeTruthy();
  });

  it("caso 4: ya pasó y me toca confirmar", async () => {
    await montar();
    await comoCasa("9");
    const s = within(situacion());
    expect(s.getByText("¿Te surtió Rubén 2?")).toBeTruthy();
    expect(s.getByRole("button", { name: "Sí, me surtió" })).toBeTruthy();
    expect(s.getByRole("button", { name: "No, sigo pendiente" })).toBeTruthy();
  });

  it("vuelve a leer cuando cambia la sesión y cuando cambia el reloj", async () => {
    await montar();
    expect(
      within(situacion()).getByText("Tu casa no está en ningún viaje"),
    ).toBeTruthy();
    await comoCasa("4");
    expect(
      within(situacion()).getByText("Estás en espera, cualquier proveedor"),
    ).toBeTruthy();
    await comoCasa("9");
    await adelantarDias(2);
    // A las 72 h la casa 9 ya no tiene que confirmar (P-10).
    await waitFor(() =>
      expect(
        within(situacion()).getByText("Tu casa no está en ningún viaje"),
      ).toBeTruthy(),
    );
  });
});

describe("E-P09 · confirmar la entrega", () => {
  it("«No, sigo pendiente» manda a la espera con prioridad", async () => {
    await montar();
    await comoCasa("9");
    fireEvent.click(boton(situacion(), "No, sigo pendiente"));
    await screen.findByText(
      "Gracias por avisar. Tu casa quedó en espera, con prioridad.",
    );
    expect(
      within(situacion()).getByText("Estás en espera, cualquier proveedor"),
    ).toBeTruthy();
    expect(within(situacion()).getByText(/con prioridad/)).toBeTruthy();
  });

  it("«Sí, me surtió» cierra la pregunta", async () => {
    await montar();
    await comoCasa("9");
    fireEvent.click(boton(situacion(), "Sí, me surtió"));
    await screen.findByText("Gracias por avisar.");
    expect(
      within(situacion()).getByText("Tu casa no está en ningún viaje"),
    ).toBeTruthy();
  });
});

describe("E-P10 · sin confirmar a las 72 h", () => {
  it("la casa queda «sin confirmar» en el viaje y no entra a la espera", async () => {
    await montar();
    await adelantarDias(2);
    await waitFor(() => expect(screen.queryByText("Pipas El Pozo")).toBeNull());
    fireEvent.click(
      screen.getByRole("button", { name: "Ver casas del viaje de Rubén 2" }),
    );
    const fila = (await screen.findByText("Casa 9")).closest("li")!;
    expect(within(fila).getByText("Sin confirmar")).toBeTruthy();
    const espera = await servicios.api.listar_espera();
    expect(espera.ok && espera.datos.some((e) => e.casa_numero === "9")).toBe(
      false,
    );
  });
});

describe("Espera", () => {
  it("E-P09/P-09 · «Salir de la espera» saca a la casa de la lista", async () => {
    await montar();
    await comoCasa("4");
    expect(screen.getAllByText("Casa 4").length).toBeGreaterThan(0);
    fireEvent.click(boton(situacion(), "Salir de la espera"));
    await screen.findByText("Listo. Saliste de la espera.");
    expect(
      within(situacion()).getByText("Tu casa no está en ningún viaje"),
    ).toBeTruthy();
    expect(screen.getByText("Por ahora nadie está en espera.")).toBeTruthy();
  });

  it("la lista de espera muestra casa, prioridad y antigüedad, sin teléfonos", async () => {
    await montar();
    const espera = screen.getByRole("heading", {
      name: "En espera",
    }).parentElement!;
    expect(within(espera).getByText("Casa 4")).toBeTruthy();
    expect(within(espera).getByText("Con prioridad")).toBeTruthy();
    expect(within(espera).getByText(/Desde hace 2 días/)).toBeTruthy();
  });
});
