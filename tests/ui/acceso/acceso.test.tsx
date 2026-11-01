// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { PrimeraVez } from "../../../src/pantallas/acceso";
import { acceso } from "../../../src/textos";
import { api, prepararDemo, sesion, verComo } from "./ayudas";

const t = acceso;

function escribir(etiqueta: string | RegExp, valor: string) {
  fireEvent.input(screen.getByLabelText(etiqueta), {
    target: { value: valor },
  });
}
function tocar(nombre: string | RegExp | HTMLElement) {
  fireEvent.click(
    typeof nombre === "object" && "tagName" in nombre
      ? nombre
      : screen.getByRole("button", { name: nombre }),
  );
}

describe("AC-02 · Ver como: Vecino de otra calle", () => {
  prepararDemo({ introduccionVista: true });

  it("no estorba a un vecino con sesión", () => {
    render(<PrimeraVez />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("muestra el rechazo de la calle y el camino de excepción", async () => {
    render(<PrimeraVez />);
    await verComo("otra_calle");
    const dialogo = await screen.findByRole("dialog", {
      name: t.otraCalle.titulo,
    });
    expect(dialogo.textContent).toContain(t.otraCalle.texto);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: t.otraCalle.soyDeEucalipto }),
      ),
    );

    tocar(t.otraCalle.pedirExcepcion);
    expect(
      await screen.findByRole("dialog", { name: t.excepcion.titulo }),
    ).toBeTruthy();

    // Otra calle del coto: se rechaza sin crear solicitud.
    escribir(t.ingreso.telefono.etiqueta, "5500000050");
    escribir(t.excepcion.casaEtiqueta, "Ciruelo 3");
    tocar(t.excepcion.enviar);
    expect(await screen.findByText(t.excepcion.calleNoParticipa)).toBeTruthy();
    expect(sesion.value.rol).toBe("sin_sesion");

    // Una casa que no está en el catálogo: queda la solicitud.
    escribir(t.excepcion.casaEtiqueta, "Eucalipto 40");
    tocar(t.excepcion.enviar);
    expect(
      await screen.findByRole("dialog", { name: t.enviada.titulo }),
    ).toBeTruthy();
    expect(screen.getByText(t.enviada.texto)).toBeTruthy();
    expect(sesion.value.rol).toBe("pendiente");
  });

  it("la pantalla se va sola al cambiar de perfil en la barra del demo", async () => {
    render(<PrimeraVez />);
    await verComo("otra_calle");
    await screen.findByRole("dialog", { name: t.otraCalle.titulo });
    await verComo("vecino", "7");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("valida el formulario de excepción", async () => {
    render(<PrimeraVez />);
    await verComo("otra_calle");
    tocar(
      await screen.findByRole("button", { name: t.otraCalle.pedirExcepcion }),
    );
    tocar(t.excepcion.enviar);
    expect(await screen.findByText(t.ingreso.telefono.invalido)).toBeTruthy();
    escribir(t.ingreso.telefono.etiqueta, "55 0000 0050");
    tocar(t.excepcion.enviar);
    expect(await screen.findByText(t.excepcion.casaVacia)).toBeTruthy();
  });
});

describe("Acceso con teléfono, PIN y casa", () => {
  prepararDemo({ introduccionVista: true });

  async function abrirTelefono() {
    render(<PrimeraVez />);
    await verComo("otra_calle");
    tocar(
      await screen.findByRole("button", { name: t.otraCalle.soyDeEucalipto }),
    );
  }

  it("da formato al teléfono mientras se escribe", async () => {
    await abrirTelefono();
    escribir(t.ingreso.telefono.etiqueta, "5500000007");
    expect(
      (screen.getByLabelText(t.ingreso.telefono.etiqueta) as HTMLInputElement)
        .value,
    ).toBe("55 0000 0007");
  });

  it("un teléfono de la lista entra con su PIN", async () => {
    await abrirTelefono();
    escribir(t.ingreso.telefono.etiqueta, "5500000007");
    tocar(t.ingreso.telefono.continuar);
    escribir(t.ingreso.pin.etiquetaEntrar, "12");
    tocar(t.ingreso.pin.entrar);
    expect(await screen.findByText(t.ingreso.pin.invalido)).toBeTruthy();
    escribir(t.ingreso.pin.etiquetaEntrar, "1234");
    tocar(t.ingreso.pin.entrar);
    await waitFor(() =>
      expect(sesion.value).toEqual({ casa: "7", rol: "vecino" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("revisa que el teléfono tenga 10 números", async () => {
    await abrirTelefono();
    escribir(t.ingreso.telefono.etiqueta, "550000");
    tocar(t.ingreso.telefono.continuar);
    expect(await screen.findByText(t.ingreso.telefono.invalido)).toBeTruthy();
  });

  it("la primera vez crea el PIN y elige la casa", async () => {
    await verComo("coordinador");
    expect((await api.reiniciar_telefono("5500000009")).ok).toBe(true);
    await abrirTelefono();
    escribir(t.ingreso.telefono.etiqueta, "5500000009");
    tocar(t.ingreso.telefono.continuar);
    escribir(t.ingreso.pin.etiquetaEntrar, "4321");
    tocar(t.ingreso.pin.entrar);

    expect(
      await screen.findByRole("dialog", { name: t.ingreso.pin.tituloCrear }),
    ).toBeTruthy();
    escribir(t.ingreso.pin.etiquetaCrear, "4321");
    escribir(t.ingreso.pin.etiquetaRepetir, "1111");
    tocar(t.ingreso.telefono.continuar);
    expect(await screen.findByText(t.ingreso.pin.distinto)).toBeTruthy();
    escribir(t.ingreso.pin.etiquetaRepetir, "4321");
    tocar(t.ingreso.telefono.continuar);

    expect(
      await screen.findByRole("dialog", { name: t.ingreso.casa.titulo }),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Casa \d+$/ })).toHaveLength(
      25,
    );
    tocar(t.ingreso.casa.numero("9"));
    await waitFor(() =>
      expect(sesion.value).toEqual({ casa: "9", rol: "vecino" }),
    );
  });

  it("«Mi casa no está en la lista» lleva a pedir la excepción", async () => {
    await verComo("coordinador");
    await api.reiniciar_telefono("5500000011");
    await abrirTelefono();
    escribir(t.ingreso.telefono.etiqueta, "5500000011");
    tocar(t.ingreso.telefono.continuar);
    escribir(t.ingreso.pin.etiquetaEntrar, "1234");
    tocar(t.ingreso.pin.entrar);
    await screen.findByLabelText(t.ingreso.pin.etiquetaCrear);
    escribir(t.ingreso.pin.etiquetaCrear, "1234");
    escribir(t.ingreso.pin.etiquetaRepetir, "1234");
    tocar(t.ingreso.telefono.continuar);
    tocar(
      await screen.findByRole("button", { name: t.ingreso.casa.noEstaEnLista }),
    );
    expect(
      await screen.findByRole("dialog", { name: t.excepcion.titulo }),
    ).toBeTruthy();
  });

  it("un teléfono fuera de la lista pide acceso y queda pendiente", async () => {
    await abrirTelefono();
    escribir(t.ingreso.telefono.etiqueta, "5500000077");
    tocar(t.ingreso.telefono.continuar);
    escribir(t.ingreso.pin.etiquetaEntrar, "1234");
    tocar(t.ingreso.pin.entrar);
    expect(
      await screen.findByText(t.ingreso.telefonoFueraDeLista),
    ).toBeTruthy();
    escribir(t.excepcion.casaEtiqueta, "Eucalipto 12");
    tocar(t.excepcion.enviar);
    expect(
      await screen.findByRole("dialog", { name: t.enviada.titulo }),
    ).toBeTruthy();
    expect(sesion.value.rol).toBe("pendiente");
    // La respuesta de la solicitud no lleva teléfonos a la pantalla.
    expect(document.body.textContent).not.toMatch(/5500000077|55 0000 0077/);
  });
});
