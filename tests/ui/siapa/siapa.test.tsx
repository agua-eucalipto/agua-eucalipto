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
      expect(resumenTitulo.value).toBe(siapa.resumen("7", 3, 6)),
    );
    for (const c of ["SIAPAZAP20261001", "SIAPAZAP20260950", "116245001"]) {
      const tarjetaFolio = tarjeta(c);
      expect(tarjetaFolio).toBeTruthy();
    }
    expect(
      within(tarjeta("SIAPAZAP20261001")).getByText(siapa.canal.whatsapp),
    ).toBeTruthy();
    expect(
      within(tarjeta("116245001")).getByText(siapa.canal.telefono),
    ).toBeTruthy();
    expect(
      within(tarjeta("2402")).getByText(siapa.canal.ayuntamiento),
    ).toBeTruthy();
    expect(
      within(tarjeta("SIAPAZAP20261001")).queryByRole("button", {
        name: /No me surtieron/,
      }),
    ).toBeNull();
    const resumen = screen.getByText(siapa.anteriores(3));
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
      expect(resumenTitulo.value).toBe(siapa.resumen("7", 0, 6)),
    );
    expect(screen.queryByText(siapa.sinActivos)).toBeNull();
    expect(tarjeta("2402")).toBeTruthy();
    expect(screen.getByText(siapa.anteriores(6))).toBeTruthy();
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
      expect(resumenTitulo.value).toBe(siapa.resumen("7", 2, 6)),
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
    expect(document.querySelector(".campo__ok")).toBeNull();
    escribir("siapazap");
    expect(document.querySelector(".campo__ok")?.textContent).toContain(
      siapa.registro.canalDetectado("whatsapp"),
    );
    escribir("1162");
    expect(document.querySelector(".campo__ok")?.textContent).toContain(
      siapa.registro.canalDetectado("ayuntamiento"),
    );
    escribir("11625");
    expect(document.querySelector(".campo__ok")?.textContent).toContain(
      siapa.registro.canalDetectado("telefono"),
    );
    escribir("2408");
    expect(document.querySelector(".campo__ok")?.textContent).toContain(
      siapa.registro.canalDetectado("ayuntamiento"),
    );
    const registro = screen.getByRole("dialog", {
      name: siapa.registro.titulo,
    });
    for (const linea of siapa.registro.ayuda) {
      expect(within(registro).getByText(linea)).toBeTruthy();
    }
    const campo = screen.getByLabelText(
      siapa.registro.etiqueta,
    ) as HTMLInputElement;
    expect(campo.value).toBe("2408");
    const contacto = within(registro).getByRole("button", {
      name: /WhatsApp del Gobierno de Zapopan/,
    });
    expect(contacto.className).toContain("enlace-contacto");
    expect(contacto.className).not.toMatch(/\bbtn\b/);
    contacto.focus();
    fireEvent.click(contacto);
    const aviso = screen.getByRole("dialog", {
      name: comun.contactos.introduccion("Gobierno de Zapopan"),
    });
    expect(registro.parentElement?.hasAttribute("inert")).toBe(true);
    expect(registro.parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(campo.value).toBe("2408");
    expect(within(aviso).getByText("WhatsApp")).toBeTruthy();
    expect(
      within(aviso).getByRole("link", { name: comun.contactos.llamar }),
    ).toHaveProperty("href", "tel:+523338182222");
    expect(
      within(aviso).getByRole("link", { name: comun.contactos.mensaje }),
    ).toHaveProperty("href", "https://wa.me/523338182222");
    fireEvent.click(
      within(aviso).getByRole("button", { name: comun.contactos.cancelar }),
    );
    expect(campo.value).toBe("2408");
    expect(document.activeElement).toBe(contacto);
    expect(registro.parentElement?.hasAttribute("inert")).toBe(false);
    const telefonoBoton = within(registro).getByRole("button", {
      name: /Teléfono del SIAPA/,
    });
    telefonoBoton.focus();
    fireEvent.click(telefonoBoton);
    const telefono = screen.getByRole("dialog", {
      name: comun.contactos.introduccion("SIAPA"),
    });
    expect(registro.parentElement?.hasAttribute("inert")).toBe(true);
    expect(within(telefono).getByText("Teléfono")).toBeTruthy();
    expect(
      within(telefono).getByRole("link", { name: comun.contactos.llamar }),
    ).toHaveProperty("href", "tel:+523336682482");
    expect(
      within(telefono).queryByRole("link", { name: comun.contactos.mensaje }),
    ).toBeNull();
    expect(campo.value).toBe("2408");
    fireEvent.click(
      within(telefono).getByRole("button", { name: comun.contactos.cancelar }),
    );
    expect(campo.value).toBe("2408");
    expect(document.activeElement).toBe(telefonoBoton);
    expect(
      screen.getByRole("dialog", { name: siapa.registro.titulo }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("dialog", {
        name: comun.contactos.introduccion("Gobierno de Zapopan"),
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("dialog", {
        name: comun.contactos.introduccion("SIAPA"),
      }),
    ).toBeNull();
  });

  it("E-F02: formatos inválidos muestran el texto de la Api", async () => {
    await pintar();
    await abrirRegistro();
    for (const malo of ["ABC123", "SIAPAZAP", "11621", "12345"]) {
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

describe("folio vencido de la casa 4", () => {
  beforeEach(async () => {
    await verComo("vecino", "4");
  });

  it("F-12: «No me surtieron» lo pasa a anteriores y el código sigue bloqueado", async () => {
    await pintar();
    const codigo = "SIAPAZAP20260980";
    const vigente = within(tarjeta(codigo));
    expect(vigente.getByText(siapa.insignia.vencio)).toBeTruthy();
    fireEvent.click(
      vigente.getByRole("button", {
        name: `${siapa.acciones.sinSurtir}, folio ${codigo}`,
      }),
    );
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/Lo quitaremos de la lista/)).toBeTruthy();
    fireEvent.click(
      within(dialogo).getByRole("button", { name: siapa.sinSurtir.confirmar }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText(siapa.hecho.sinSurtir)).toBeTruthy();
    fireEvent.click(await screen.findByText(siapa.anteriores(1)));
    const cerrado = within(await screen.findByLabelText(`Folio ${codigo}`));
    expect(cerrado.getByText(siapa.insignia.cerradoSinSurtir)).toBeTruthy();
    expect(cerrado.getByText(/Cerrado el/)).toBeTruthy();

    await abrirRegistro();
    escribir(codigo);
    fireEvent.click(
      screen.getByRole("button", { name: siapa.registro.confirmar }),
    );
    expect(await screen.findByText(siapa.errores.FOLIO_YA_USADO!)).toBeTruthy();
  });
});
