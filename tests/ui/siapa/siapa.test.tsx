// @vitest-environment happy-dom
import { resumenTitulo } from "../../../src/app/titulo";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adelantarUnDia,
  iniciarApi,
  reiniciarDemo,
  verComo,
} from "../../../src/app/servicios";
import { PantallaSiapa } from "../../../src/pantallas/siapa";
import { comun, siapa } from "../../../src/textos";

beforeAll(async () => {
  await iniciarApi();
});

beforeEach(async () => {
  await reiniciarDemo();
});

afterEach(() => {
  cleanup();
});

const tarjeta = (codigo: string) => screen.getByLabelText(`Folio ${codigo}`);

async function pintar() {
  render(<PantallaSiapa />);
  await waitFor(() =>
    expect(screen.queryByText(comun.estados.cargando)).toBeNull(),
  );
}

async function abrirRegistro() {
  fireEvent.click(screen.getByRole("button", { name: siapa.registrar }));
  return screen.findByRole("dialog");
}

function escribir(texto: string) {
  fireEvent.input(screen.getByLabelText(siapa.registro.etiqueta), {
    target: { value: texto },
  });
}

describe("pantalla Folios SIAPA con la semilla (casa 7)", () => {
  it("muestra los folios vigentes, el resumen y el historial plegado", async () => {
    await pintar();
    await waitFor(() =>
      expect(resumenTitulo.value).toBe(siapa.resumen("7", 3, 4)),
    );
    for (const c of ["SIAPAZAP20261001", "SIAPAZAP20260950", "116245001"]) {
      expect(tarjeta(c)).toBeTruthy();
    }
    const resumen = screen.getByText(siapa.anteriores(2));
    expect(resumen.closest("details")?.hasAttribute("open")).toBe(false);
    expect(screen.getByText(siapa.avisoPermanente)).toBeTruthy();
  });

  it("marca «Vence hoy», la nota de caseta y la extensión", async () => {
    await pintar();
    const venceHoy = within(tarjeta("SIAPAZAP20261001"));
    expect(venceHoy.getByText(siapa.insignia.venceHoy)).toBeTruthy();
    expect(venceHoy.getByText(/Enviado a caseta el/)).toBeTruthy();
    const extendido = within(tarjeta("SIAPAZAP20260950"));
    expect(extendido.getByText(/Ya le diste más tiempo una vez/)).toBeTruthy();
    // Ya extendido: no se ofrece otra vez.
    expect(
      extendido.queryByRole("button", { name: /Sigue pendiente/ }),
    ).toBeNull();
  });

  it("E-F01b: surtido y reemplazado siguen bloqueando su código", async () => {
    await pintar();
    for (const codigo of ["SIAPAZAP20260900", "116244000"]) {
      await abrirRegistro();
      escribir(codigo);
      fireEvent.click(
        screen.getByRole("button", { name: siapa.registro.confirmar }),
      );
      expect(
        await screen.findByText(siapa.errores.FOLIO_YA_USADO!),
      ).toBeTruthy();
      fireEvent.click(
        screen.getByRole("button", { name: siapa.registro.regresar }),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });

  it("E-F03/E-F04: con el tope lleno pide elegir cuál se reemplaza", async () => {
    await pintar();
    await abrirRegistro();
    escribir("siapazap 3000-0001");
    fireEvent.click(
      screen.getByRole("button", { name: siapa.registro.confirmar }),
    );
    expect(
      await screen.findByText(siapa.eligeReemplazo.descripcion("whatsapp")),
    ).toBeTruthy();
    // Solo se ofrecen los 2 activos de WhatsApp.
    const dialogo = within(screen.getByRole("dialog"));
    expect(
      dialogo.getByRole("button", {
        name: siapa.eligeReemplazo.opcion("SIAPAZAP20261001"),
      }),
    ).toBeTruthy();
    expect(dialogo.queryByRole("button", { name: /116245001/ })).toBeNull();

    fireEvent.click(
      dialogo.getByRole("button", {
        name: siapa.eligeReemplazo.opcion("SIAPAZAP20260950"),
      }),
    );
    expect(
      await screen.findByText(siapa.reemplazo.aviso("SIAPAZAP20260950")),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: siapa.reemplazo.confirmar }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByLabelText("Folio SIAPAZAP30000001")).toBeTruthy();
    expect(
      within(tarjeta("SIAPAZAP20260950")).getByText(siapa.insignia.reemplazado),
    ).toBeTruthy();
    expect(
      screen.getByText(siapa.hecho.reemplazado("SIAPAZAP30000001")),
    ).toBeTruthy();
  });

  it("F-05: reemplaza voluntariamente desde la tarjeta", async () => {
    await pintar();
    fireEvent.click(
      screen.getByRole("button", {
        name: `${siapa.acciones.reemplazar}, folio 116245001`,
      }),
    );
    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).getByText(siapa.reemplazo.aviso("116245001")),
    ).toBeTruthy();
    fireEvent.input(screen.getByLabelText(siapa.registro.etiqueta), {
      target: { value: "1162-45999" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: siapa.reemplazo.confirmar }),
    );
    expect(await screen.findByLabelText("Folio 116245999")).toBeTruthy();
    expect(
      within(tarjeta("116245001")).getByText(siapa.insignia.reemplazado),
    ).toBeTruthy();
  });

  it("E-F07: «Sigue pendiente» una sola vez, con la fecha en el aviso", async () => {
    await pintar();
    fireEvent.click(
      screen.getByRole("button", {
        name: `${siapa.acciones.pendiente}, folio 116245001`,
      }),
    );
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/Quedará vigente hasta el/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: siapa.pendiente.confirmar }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const t = within(await screen.findByLabelText("Folio 116245001"));
    await waitFor(() =>
      expect(t.getByText(/Ya le diste más tiempo una vez/)).toBeTruthy(),
    );
    expect(t.queryByRole("button", { name: /Sigue pendiente/ })).toBeNull();
  });

  it("E-F08: «Me surtieron» quita los otros activos con la casilla por omisión", async () => {
    await pintar();
    fireEvent.click(
      screen.getByRole("button", {
        name: `${siapa.acciones.surtieron}, folio SIAPAZAP20261001`,
      }),
    );
    const casilla = (await screen.findByLabelText(
      siapa.surtieron.quemarOtros(2),
    )) as HTMLInputElement;
    expect(casilla.checked).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: siapa.surtieron.confirmar }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(resumenTitulo.value).toBe(siapa.resumen("7", 0, 4)),
    );
    expect(screen.getByText(siapa.sinActivos)).toBeTruthy();
    expect(screen.getByText(siapa.anteriores(5))).toBeTruthy();
  });

  it("E-F08: sin la casilla solo cierra ese folio", async () => {
    await pintar();
    fireEvent.click(
      screen.getByRole("button", {
        name: `${siapa.acciones.surtieron}, folio SIAPAZAP20261001`,
      }),
    );
    fireEvent.click(
      await screen.findByLabelText(siapa.surtieron.quemarOtros(2)),
    );
    fireEvent.click(
      screen.getByRole("button", { name: siapa.surtieron.confirmar }),
    );
    await waitFor(() =>
      expect(resumenTitulo.value).toBe(siapa.resumen("7", 2, 4)),
    );
  });

  it("AC-02: al adelantar el reloj la tarjeta cambia sin recargar", async () => {
    await pintar();
    expect(
      within(tarjeta("SIAPAZAP20261001")).getByText(siapa.insignia.venceHoy),
    ).toBeTruthy();
    await act(async () => {
      await adelantarUnDia();
    });
    await waitFor(() =>
      expect(
        within(tarjeta("SIAPAZAP20261001")).getByText(siapa.insignia.vencio),
      ).toBeTruthy(),
    );
    // Un folio vencido sigue pudiéndose marcar como surtido.
    expect(
      within(tarjeta("SIAPAZAP20261001")).getByRole("button", {
        name: /Me surtieron/,
      }),
    ).toBeTruthy();
  });

  it("vuelve a leer cuando cambia la sesión", async () => {
    await pintar();
    await act(async () => {
      await verComo("vecino", "10");
    });
    await waitFor(() => expect(screen.getByText(siapa.vacio)).toBeTruthy());
  });

  it("no deja folios de la casa al pasar a otra calle", async () => {
    await pintar();
    expect(document.querySelectorAll("article").length).toBeGreaterThan(0);
    await act(async () => {
      await verComo("otra_calle");
    });
    await waitFor(() => expect(screen.getByText(siapa.noCargo)).toBeTruthy());
    expect(document.querySelectorAll("article")).toHaveLength(0);
    expect(screen.queryByText(siapa.avisoPermanente)).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Me surtieron/ })).toBeNull();
  });

  it("el foco queda en la primera opción tras el tope del canal", async () => {
    await pintar();
    await abrirRegistro();
    escribir("SIAPAZAP30000001");
    fireEvent.click(
      screen.getByRole("button", { name: siapa.registro.confirmar }),
    );
    const [primera] = await screen.findAllByRole("button", {
      name: /^Reemplazar SIAPAZAP/,
    });
    await waitFor(() => expect(document.activeElement).toBe(primera));
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      siapa.eligeReemplazo.descripcion("whatsapp"),
    );
  });

  it("al reemplazar con otro canal explica que debe ser del mismo", async () => {
    await pintar();
    fireEvent.click(
      screen.getByRole("button", {
        name: `${siapa.acciones.reemplazar}, folio 116245001`,
      }),
    );
    await screen.findByRole("dialog");
    escribir("SIAPAZAP30000002");
    fireEvent.click(
      screen.getByRole("button", { name: siapa.reemplazo.confirmar }),
    );
    expect(
      await screen.findByText(siapa.reemplazoOtroCanal("telefono")),
    ).toBeTruthy();
  });
});

describe("registro desde una casa sin folios (casa 10)", () => {
  beforeEach(async () => {
    await verComo("vecino", "10");
  });

  it("E-F02: detecta el canal mientras se escribe", async () => {
    await pintar();
    await abrirRegistro();
    expect(
      screen.queryByText(siapa.registro.canalDetectado("whatsapp")),
    ).toBeNull();
    escribir("siapazap");
    expect(
      await screen.findByText(siapa.registro.canalDetectado("whatsapp")),
    ).toBeTruthy();
    escribir("1162");
    expect(
      await screen.findByText(siapa.registro.canalDetectado("telefono")),
    ).toBeTruthy();
  });

  it("E-F02: formatos inválidos muestran el texto de la Api", async () => {
    await pintar();
    await abrirRegistro();
    for (const malo of ["ABC123", "SIAPAZAP", "1162"]) {
      escribir(malo);
      fireEvent.click(
        screen.getByRole("button", { name: siapa.registro.confirmar }),
      );
      expect(
        await screen.findByText(siapa.errores.FOLIO_FORMATO_INVALIDO!),
      ).toBeTruthy();
    }
  });

  it("E-F01a: el mismo código escrito distinto ya está usado", async () => {
    await pintar();
    await abrirRegistro();
    escribir("siapazap 1234-5678");
    fireEvent.click(
      screen.getByRole("button", { name: siapa.registro.confirmar }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByLabelText("Folio SIAPAZAP12345678")).toBeTruthy();
    expect(
      screen.getByText(siapa.hecho.registrado("SIAPAZAP12345678")),
    ).toBeTruthy();

    await abrirRegistro();
    escribir("SIAPAZAP12345678");
    fireEvent.click(
      screen.getByRole("button", { name: siapa.registro.confirmar }),
    );
    expect(await screen.findByText(siapa.errores.FOLIO_YA_USADO!)).toBeTruthy();
  });

  it("AC-03: un folio de 20 caracteres se muestra completo", async () => {
    await pintar();
    await abrirRegistro();
    const largo = "SIAPAZAP12345678901A".slice(0, 19) + "2";
    expect(largo).toHaveLength(20);
    escribir(largo);
    fireEvent.click(
      screen.getByRole("button", { name: siapa.registro.confirmar }),
    );
    const t = await screen.findByLabelText(`Folio ${largo}`);
    expect(within(t).getByText(largo)).toBeTruthy();
  });
});
