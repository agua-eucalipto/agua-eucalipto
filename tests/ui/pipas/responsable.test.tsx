// @vitest-environment happy-dom
import { fireEvent, screen, waitFor, within } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import {
  boton,
  comoCasa,
  montar,
  prepararDemo,
  servicios,
  situacion,
  tarjeta,
} from "./ayudas";

prepararDemo();

async function verViaje(proveedor: string) {
  fireEvent.click(
    screen.getByRole("button", { name: `Ver casas del viaje de ${proveedor}` }),
  );
  await screen.findByRole("button", { name: /Volver a Pipas/ });
}

function escribir(etiqueta: string | RegExp, valor: string) {
  fireEvent.input(screen.getByLabelText(etiqueta), {
    target: { value: valor },
  });
}

describe("Abrir un viaje (E-P02)", () => {
  it("sin la casilla del disclaimer, la `Api` responde FALTA_ACEPTAR", async () => {
    await montar();
    fireEvent.click(boton(situacion(), /Abrir un viaje/));
    await screen.findByRole("heading", { name: "Abrir un viaje" });
    escribir("Proveedor", "Rubén 3");
    fireEvent.click(screen.getByRole("button", { name: "Abrir el viaje" }));
    await screen.findByText(
      "Para continuar, marca la casilla de confirmación.",
    );
    expect(
      screen.getByRole("heading", { name: "Abrir un viaje" }),
    ).toBeTruthy();
  });

  it("el disclaimer del responsable es el aprobado", async () => {
    await montar();
    fireEvent.click(boton(situacion(), /Abrir un viaje/));
    await screen.findByRole("heading", { name: "Abrir un viaje" });
    expect(
      screen.getByText(
        "Gracias por abrir este viaje. Quien lo abre ayuda a coordinarlo: llamar al pipero, avisar cuándo viene y marcar cuando ya pasó. Si pasan 24 horas sin movimiento, otro vecino anotado podrá tomar tu lugar.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Lo entiendo y estoy de acuerdo"),
    ).toBeTruthy();
  });

  it("al abrir, las casas en espera entran solas, con su prioridad", async () => {
    await montar();
    fireEvent.click(boton(situacion(), /Abrir un viaje/));
    await screen.findByRole("heading", { name: "Abrir un viaje" });
    escribir("Proveedor", "Rubén 3");
    escribir(/Precio por casa/, "140");
    fireEvent.click(screen.getByLabelText("Lo entiendo y estoy de acuerdo"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir el viaje" }));
    await screen.findByText(/Se sumó 1 casa que estaba en espera/);
    expect(
      await screen.findByRole("heading", { name: "Rubén 3" }),
    ).toBeTruthy();
    expect(await screen.findByText("$140 por casa")).toBeTruthy();
    const fila4 = screen.getByText("Casa 4").closest("li")!;
    expect(within(fila4).getByText("Con prioridad")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Casas anotadas (2)" }),
    ).toBeTruthy();
    // La casa que abrió coordina y queda anotada.
    const fila7 = screen.getByText("Casa 7").closest("li")!;
    expect(within(fila7).getByText("Coordina")).toBeTruthy();
    expect(within(fila7).getByText("Tu casa")).toBeTruthy();
  });

  it("los datos inválidos se rechazan con el mensaje de la `Api`", async () => {
    await montar();
    fireEvent.click(boton(situacion(), /Abrir un viaje/));
    await screen.findByRole("heading", { name: "Abrir un viaje" });
    fireEvent.click(screen.getByLabelText("Lo entiendo y estoy de acuerdo"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir el viaje" }));
    await screen.findByText(/Revisa los datos: escribe el proveedor/);
  });

  it("P-01 · si mientras tanto la casa se anotó en un viaje, abrir otro lo rechaza", async () => {
    await montar();
    fireEvent.click(boton(situacion(), /Abrir un viaje/));
    await screen.findByRole("heading", { name: "Abrir un viaje" });
    // En otro celular, la misma casa se anota en Rubén 1.
    const lista = await servicios.api.listar_viajes();
    if (!lista.ok) throw new Error("no se pudieron leer los viajes");
    await servicios.api.anotarse(
      lista.datos.find((v) => v.proveedor === "Rubén 1")!.id,
    );
    escribir("Proveedor", "Rubén 3");
    fireEvent.click(screen.getByLabelText("Lo entiendo y estoy de acuerdo"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir el viaje" }));
    await screen.findByText(
      "Ya estás anotado en otro viaje. Si prefieres este, primero sal del otro.",
    );
    expect(
      screen.getByRole("heading", { name: "Abrir un viaje" }),
    ).toBeTruthy();
  });

  it("el mínimo se ajusta con − y +, sin salirse del rango", async () => {
    await montar();
    fireEvent.click(boton(situacion(), /Abrir un viaje/));
    await screen.findByRole("heading", { name: "Abrir un viaje" });
    const valor = () => screen.getByRole("status").textContent;
    expect(valor()).toBe("5");
    fireEvent.click(screen.getByRole("button", { name: "Una casa más" }));
    expect(valor()).toBe("6");
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Una casa menos" }));
    }
    expect(valor()).toBe("1");
    expect(
      screen
        .getByRole("button", { name: "Una casa menos" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });
});

describe("Vista de responsable", () => {
  it("en «juntando» «Ya llamé» está deshabilitado y dice cuántas casas faltan", async () => {
    await montar();
    await comoCasa("12");
    await verViaje("Rubén 1");
    const ya = screen.getByRole("button", {
      name: "Ya llamé, viene en camino",
    });
    expect(ya.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Faltan 2 casas para el mínimo")).toBeTruthy();
    fireEvent.click(ya);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar viaje" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Darme de baja" })).toBeNull();
    expect(
      screen.getByText(/Quien coordina no puede darse de baja/),
    ).toBeTruthy();
  });

  it("E-P05 · pedir con tiempo aproximado cierra el viaje a nuevas casas", async () => {
    await montar();
    await comoCasa("5");
    await verViaje("Pipas El Pozo");
    fireEvent.click(
      screen.getByRole("button", { name: "Ya llamé, viene en camino" }),
    );
    const dialogo = await screen.findByRole("dialog");
    // El foco inicial cae en la primera hora, no en el botón aún deshabilitado.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialogo).getByRole("button", { name: "~1 h" }),
      ),
    );
    const si = within(dialogo).getByRole("button", { name: "Sí, ya llamé" });
    expect(si.getAttribute("aria-disabled")).toBe("true");
    for (const t of ["~1 h", "~2 h", "~4 h", "Hoy", "Otro"]) {
      expect(within(dialogo).getByRole("button", { name: t })).toBeTruthy();
    }
    fireEvent.click(within(dialogo).getByRole("button", { name: "~2 h" }));
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, ya llamé" }),
    );
    await screen.findByText("Listo. Ya avisamos que el viaje se pidió.");
    expect(
      screen.getAllByText("Pedido · llega en ~2 h").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Este viaje ya se pidió. Si alguien más necesita agua, puede abrir el siguiente viaje.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Ya pasó la pipa" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar viaje" })).toBeNull();
  });

  it("«Otro» pide escribir la hora y la manda tal cual", async () => {
    await montar();
    await comoCasa("5");
    await verViaje("Pipas El Pozo");
    fireEvent.click(
      screen.getByRole("button", { name: "Ya llamé, viene en camino" }),
    );
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Otro" }));
    fireEvent.input(
      within(dialogo).getByLabelText("¿Cuándo llega, más o menos?"),
      {
        target: { value: "mañana por la tarde" },
      },
    );
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, ya llamé" }),
    );
    await screen.findByText("Listo. Ya avisamos que el viaje se pidió.");
    expect(
      screen.getAllByText("Pedido · llega mañana por la tarde").length,
    ).toBeGreaterThan(0);
  });

  it("«Ya pasó la pipa» abre la confirmación por casa", async () => {
    await montar();
    await comoCasa("19");
    await verViaje("Don Beto");
    fireEvent.click(screen.getByRole("button", { name: "Ya pasó la pipa" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, ya pasó" }),
    );
    await screen.findByText(/Ahora cada casa anotada puede confirmar/);
    expect(screen.getAllByText("Ya pasó").length).toBeGreaterThan(0);
    // La casa 19 también es una de las anotadas y le toca confirmar.
    expect(screen.getByText("¿Te surtió Don Beto?")).toBeTruthy();
    const fila = screen.getByText("Casa 20").closest("li")!;
    expect(within(fila).getByText("Falta confirmar")).toBeTruthy();
  });

  it("editar cambia proveedor, precio, mínimo y capacidad antes de pedir", async () => {
    await montar();
    await comoCasa("12");
    await verViaje("Rubén 1");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    await screen.findByRole("heading", { name: "Editar el viaje" });
    expect((screen.getByLabelText("Proveedor") as HTMLInputElement).value).toBe(
      "Rubén 1",
    );
    escribir(/Precio por casa/, "160");
    fireEvent.click(screen.getByRole("button", { name: "Una casa menos" }));
    fireEvent.click(screen.getByRole("button", { name: "Una casa menos" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Listo. Guardamos los cambios del viaje.");
    expect(await screen.findByText("$160 por casa")).toBeTruthy();
    // Con el mínimo en 3 y 3 casas anotadas, el viaje ya está listo (P-15).
    expect(screen.getAllByText("Listo para pedir").length).toBeGreaterThan(0);
    expect(
      screen
        .getByRole("button", { name: "Ya llamé, viene en camino" })
        .getAttribute("aria-disabled"),
    ).toBeNull();
  });

  it("P-14 · cancelar manda a las casas a la espera", async () => {
    await montar();
    await comoCasa("12");
    await verViaje("Rubén 1");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar viaje" }));
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).getByText(/Las casas anotadas pasarán a la espera/),
    ).toBeTruthy();
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, cancelar el viaje" }),
    );
    await screen.findByText(
      "Listo. Cancelaste el viaje y las casas pasaron a la espera.",
    );
    expect(screen.queryByRole("article", { name: "Viaje Rubén 1" })).toBeNull();
    const espera = screen.getByRole("heading", {
      name: "En espera",
    }).parentElement!;
    for (const c of ["12", "14", "16"]) {
      expect(within(espera).getByText(`Casa ${c}`)).toBeTruthy();
    }
    expect(
      within(situacion()).getByText("Estás en espera, cualquier proveedor"),
    ).toBeTruthy();
  });
});

describe("E-P12 · tomar la responsabilidad", () => {
  it("una casa anotada puede encargarse si el responsable lleva más de 24 h inactivo", async () => {
    await montar();
    await comoCasa("6");
    expect(
      within(tarjeta("Pipas El Pozo")).getByText(
        /Hace más de 24 horas que no hay movimiento/,
      ),
    ).toBeTruthy();
    await verViaje("Pipas El Pozo");
    fireEvent.click(
      screen.getByRole("button", { name: "Tomar la responsabilidad" }),
    );
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).queryByText(/Gracias por abrir este viaje/),
    ).toBeNull();
    expect(
      within(dialogo).getByText(
        /^Quien coordina el viaje ayuda a llamar al pipero/,
      ),
    ).toBeTruthy();
    // Sin aceptar el disclaimer, la `Api` lo rechaza dentro del diálogo.
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, me encargo" }),
    );
    await within(dialogo).findByText(
      "Para continuar, marca la casilla de confirmación.",
    );
    fireEvent.click(
      within(dialogo).getByLabelText("Lo entiendo y estoy de acuerdo"),
    );
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, me encargo" }),
    );
    await screen.findByText("Listo. Ahora tú coordinas este viaje.");
    expect(
      screen.getAllByText("Tú coordinas este viaje").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
  });

  it("quien no está anotado ve el aviso pero no el botón (NO_ANOTADO)", async () => {
    await montar();
    await verViaje("Pipas El Pozo");
    expect(
      screen.getByText(/Hace más de 24 horas que no hay movimiento/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Tomar la responsabilidad" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Anotarme" })).toBeTruthy();
  });

  it("con el responsable activo no se ofrece tomar la responsabilidad", async () => {
    await montar();
    await comoCasa("14");
    await verViaje("Rubén 1");
    expect(
      screen.queryByRole("button", { name: "Tomar la responsabilidad" }),
    ).toBeNull();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Darme de baja" }),
      ).toBeTruthy(),
    );
  });
});
