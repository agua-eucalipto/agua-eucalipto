// @vitest-environment happy-dom
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import {
  adelantarDias,
  boton,
  comoCasa,
  montar,
  prepararDemo,
  servicios,
  situacion,
  tarjeta,
} from "./ayudas";

prepararDemo();

async function idDeViaje(proveedor: string): Promise<string> {
  const r = await servicios.api.listar_viajes();
  if (!r.ok) throw new Error("no se pudieron leer los viajes");
  return r.datos.find((v) => v.proveedor === proveedor)!.id;
}

async function verCasas(proveedor: string) {
  fireEvent.click(
    screen.getByRole("button", { name: `Ver casas del viaje de ${proveedor}` }),
  );
  await screen.findByRole("button", { name: /Volver a Pipas/ });
}

describe("Lista de viajes", () => {
  it("muestra el disclaimer permanente, los viajes y los que pasaron", async () => {
    await montar();
    expect(
      screen.getByText(
        "Cada pipero decide a quién surte, así que anotarte no asegura que te toque agua. Esta lista solo nos ayuda a organizarnos entre vecinos.",
      ),
    ).toBeTruthy();
    const abiertos = screen.getByRole("heading", {
      name: "Viajes abiertos",
    }).parentElement!;
    for (const nombre of ["Rubén 1", "Pipas El Pozo", "Don Beto"]) {
      expect(
        within(abiertos).getByRole("article", { name: `Viaje ${nombre}` }),
      ).toBeTruthy();
    }
    const pasaron = screen.getByRole("heading", {
      name: "Pasaron recientemente",
    }).parentElement!;
    expect(
      within(pasaron).getByRole("article", { name: "Viaje Rubén 2" }),
    ).toBeTruthy();
  });

  it("cada tarjeta trae estado, precio, responsable y avance", async () => {
    await montar();
    const r1 = within(tarjeta("Rubén 1"));
    expect(r1.getByText("Juntando (3 de 5)")).toBeTruthy();
    expect(r1.getByText("$150 por casa")).toBeTruthy();
    expect(r1.getByText("Coordina Casa 12")).toBeTruthy();
    expect(r1.getByText("Alcanza para unas 8 casas")).toBeTruthy();
    const pozo = within(tarjeta("Pipas El Pozo"));
    expect(pozo.getByText("Listo para pedir")).toBeTruthy();
    expect(pozo.getByText("$180 por casa")).toBeTruthy();
    const rub2 = within(tarjeta("Rubén 2"));
    expect(rub2.getByText("Ya pasó")).toBeTruthy();
  });

  it("nunca muestra teléfonos", async () => {
    await montar();
    const texto = document.body.textContent ?? "";
    expect(texto).not.toMatch(/\d{10}/);
    expect(texto).not.toMatch(/\d{2}\s\d{4}\s\d{4}/);
  });

  it("sin viajes abiertos muestra el estado vacío", async () => {
    await montar();
    await adelantarDias(3);
    await waitFor(() =>
      expect(
        screen.getByText(
          "No hay viajes abiertos. Puedes abrir uno o anotarte en espera.",
        ),
      ).toBeTruthy(),
    );
  });
});

describe("AC-02 · Don Beto (E-P06)", () => {
  it("«puede que no alcance» en la tarjeta y la baja después de pedida en el detalle", async () => {
    await montar();
    const don = within(tarjeta("Don Beto"));
    expect(don.getByText("Puede que no alcance")).toBeTruthy();
    expect(don.getByText("Pedido · llega en ~2 h")).toBeTruthy();
    expect(
      don.getByText(
        "Este viaje ya se pidió. Si alguien más necesita agua, puede abrir el siguiente viaje.",
      ),
    ).toBeTruthy();
    expect(don.queryByRole("button", { name: /^Anotarme/ })).toBeNull();

    await verCasas("Don Beto");
    expect(
      screen.getByRole("heading", { name: "Casas anotadas (7)" }),
    ).toBeTruthy();
    const casa17 = screen.getByText("Casa 17").closest("li")!;
    expect(within(casa17).getByText("Puede que no alcance")).toBeTruthy();
    const casa2 = screen.getByText("Casa 2").closest("li")!;
    expect(
      within(casa2).getByText("Se dio de baja después de pedido"),
    ).toBeTruthy();
    expect(casa2.className).toContain("fila--baja");
    // Las seis primeras no llevan la marca.
    const casa1 = screen.getByText("Casa 1").closest("li")!;
    expect(within(casa1).queryByText("Puede que no alcance")).toBeNull();
  });

  it("E-P03 · el orden del detalle es el de la `Api` (prioridad primero)", async () => {
    await montar();
    await verCasas("Pipas El Pozo");
    const filas = screen
      .getAllByRole("listitem")
      .map((li) => li.querySelector(".fila__casa")?.textContent)
      .filter(Boolean);
    expect(filas).toEqual([
      "Casa 13",
      "Casa 5",
      "Casa 6",
      "Casa 8",
      "Casa 10",
      "Casa 11",
    ]);
    const primera = screen.getByText("Casa 13").closest("li")!;
    expect(within(primera).getByText("Con prioridad")).toBeTruthy();
  });
});

describe("Anotarse y darse de baja", () => {
  it("E-P04 · llega al mínimo, queda lista, y al salir regresa a juntando", async () => {
    await montar();
    expect(
      within(tarjeta("Rubén 1")).getByText("Juntando (3 de 5)"),
    ).toBeTruthy();
    fireEvent.click(boton(tarjeta("Rubén 1"), /^Anotarme/));
    await screen.findByText(
      "Listo. Tu casa quedó anotada en el viaje de Rubén 1.",
    );
    expect(
      within(tarjeta("Rubén 1")).getByText("Juntando (4 de 5)"),
    ).toBeTruthy();
    expect(within(tarjeta("Rubén 1")).getByText("Ya estás aquí")).toBeTruthy();

    await comoCasa("3");
    fireEvent.click(boton(tarjeta("Rubén 1"), /^Anotarme/));
    await waitFor(() =>
      expect(
        within(tarjeta("Rubén 1")).getByText("Listo para pedir"),
      ).toBeTruthy(),
    );

    await comoCasa("7");
    fireEvent.click(boton(situacion(), "Darme de baja"));
    fireEvent.click(
      await screen.findByRole("button", { name: "Sí, darme de baja" }),
    );
    await screen.findByText("Listo. Tu casa salió del viaje de Rubén 1.");
    expect(
      within(tarjeta("Rubén 1")).getByText("Juntando (4 de 5)"),
    ).toBeTruthy();
  });

  it("E-P01 · una casa anotada no puede anotarse a otro viaje", async () => {
    await montar();
    await comoCasa("14");
    fireEvent.click(boton(tarjeta("Pipas El Pozo"), /^Anotarme/));
    await screen.findByText(
      "Ya estás anotado en otro viaje. Si prefieres este, primero sal del otro.",
    );
    expect(
      within(situacion()).getByText(
        "Estás en el viaje de Rubén 1 · Lugar 2 de 3",
      ),
    ).toBeTruthy();
  });

  it("E-P01 · anotarse sacándola de la espera", async () => {
    await montar();
    await comoCasa("4");
    fireEvent.click(boton(tarjeta("Rubén 1"), /^Anotarme/));
    await screen.findByText(
      "Listo. Tu casa quedó anotada en el viaje de Rubén 1.",
    );
    expect(
      within(situacion()).getByText(/Estás en el viaje de Rubén 1/),
    ).toBeTruthy();
    expect(screen.getByText("Por ahora nadie está en espera.")).toBeTruthy();
  });

  it("E-P05 · tras pedirse, un anotarse que llega tarde muestra «ya no recibe más casas»", async () => {
    await montar();
    // La pantalla de la casa 7 sigue mostrando «Anotarme» en El Pozo…
    expect(boton(tarjeta("Pipas El Pozo"), /^Anotarme/)).toBeTruthy();
    // …pero otra persona, en otro celular, lo pide antes.
    await servicios.apiDemo.demo_ver_como("vecino", "5");
    await servicios.api.marcar_pedida(
      await idDeViaje("Pipas El Pozo"),
      "en ~2 h",
    );
    await servicios.apiDemo.demo_ver_como("vecino", "7");
    fireEvent.click(boton(tarjeta("Pipas El Pozo"), /^Anotarme/));
    await screen.findByText("Este viaje ya no recibe más casas.");
    // Y la pantalla se vuelve a leer: ahora ya no ofrece anotarse.
    await waitFor(() =>
      expect(
        within(tarjeta("Pipas El Pozo")).queryByRole("button", {
          name: /^Anotarme/,
        }),
      ).toBeNull(),
    );
  });

  it("E-P07 · baja después de pedida queda visible para todos", async () => {
    await montar();
    await comoCasa("20");
    fireEvent.click(boton(situacion(), "Darme de baja"));
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).getByText(
        /Los demás vecinos verán que te diste de baja después de pedido/,
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Sí, darme de baja" }),
    );
    await screen.findByText("Listo. Tu casa salió del viaje de Don Beto.");
    await verCasas("Don Beto");
    const fila = screen.getByText("Casa 20").closest("li")!;
    expect(
      within(fila).getByText("Se dio de baja después de pedido"),
    ).toBeTruthy();
    expect(within(fila).getByText("Tu casa")).toBeTruthy();
  });

  it("«No, regresar» y Escape cierran el diálogo sin hacer nada", async () => {
    await montar();
    await comoCasa("14");
    fireEvent.click(boton(situacion(), "Darme de baja"));
    fireEvent.click(
      await screen.findByRole("button", { name: "No, regresar" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(boton(situacion(), "Darme de baja"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      within(situacion()).getByText(/Estás en el viaje de Rubén 1/),
    ).toBeTruthy();
  });
});

describe("E-P13 · me da igual el proveedor", () => {
  it("entra al viaje con más casas", async () => {
    await montar();
    await comoCasa("18");
    fireEvent.click(boton(situacion(), "Me da igual el proveedor"));
    await screen.findByText(
      "Listo. Tu casa quedó anotada en el viaje de Pipas El Pozo.",
    );
    expect(
      within(situacion()).getByText(
        /Estás en el viaje de Pipas El Pozo · Lugar 7 de 7/,
      ),
    ).toBeTruthy();
  });

  it("sin viajes, entra a la espera sin prioridad", async () => {
    await montar();
    await adelantarDias(3);
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Viaje Rubén 1" }),
      ).toBeNull(),
    );
    fireEvent.click(boton(situacion(), "Me da igual el proveedor"));
    await screen.findByText(
      /Estás en espera, cualquier proveedor\. Te sumaremos/,
    );
    const s = within(situacion());
    expect(s.getByText("Estás en espera, cualquier proveedor")).toBeTruthy();
    expect(s.getByText("Desde hace menos de una hora")).toBeTruthy();
    expect(s.queryByText(/con prioridad/)).toBeNull();
  });
});

describe("E-P11 · el barrido de 72 h", () => {
  it("cierra los viajes sin «ya pasó» y manda las casas a la espera con su prioridad", async () => {
    await montar();
    await adelantarDias(2);
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Viaje Pipas El Pozo" }),
      ).toBeNull(),
    );
    const espera = screen.getByRole("heading", {
      name: "En espera",
    }).parentElement!;
    for (const c of ["5", "6", "8", "10", "11", "13"]) {
      expect(within(espera).getByText(`Casa ${c}`)).toBeTruthy();
    }
    const fila13 = within(espera).getByText("Casa 13").closest("li")!;
    expect(within(fila13).getByText("Con prioridad")).toBeTruthy();
  });
});

describe("Errores inesperados", () => {
  it("una falla de la `Api` se muestra con el texto amable", async () => {
    await montar();
    const espia = vi
      .spyOn(servicios.api, "anotarse")
      .mockRejectedValueOnce(new Error("boom"));
    fireEvent.click(boton(tarjeta("Rubén 1"), /^Anotarme/));
    await screen.findByText(
      "Algo no salió como esperábamos. ¿Lo intentas otra vez?",
    );
    espia.mockRestore();
    await act(async () => {});
  });
});
