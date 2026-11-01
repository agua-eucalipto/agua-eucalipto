// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BarraDemo } from "../../../src/app/BarraDemo";
import {
  api,
  fijarAljibe,
  iniciarApi,
  reiniciarDemo,
  verComo,
} from "../../../src/app/servicios";
import { PantallaCoordinador } from "../../../src/pantallas/coordinador";
import { PantallaSiapa } from "../../../src/pantallas/siapa";
import { aljibe, comun } from "../../../src/textos";
import { jpegSinExif } from "../../aljibe/jpeg";

beforeAll(async () => {
  await iniciarApi();
});

beforeEach(async () => {
  await reiniciarDemo();
});

afterEach(() => {
  cleanup();
});

describe("nivel del aljibe en la interfaz", () => {
  it("con la bandera apagada no muestra la tarjeta ni la lista", async () => {
    render(<PantallaSiapa />);
    await waitFor(() =>
      expect(screen.queryByText(comun.estados.cargando)).toBeNull(),
    );
    expect(screen.queryByRole("article", { name: aljibe.titulo })).toBeNull();

    cleanup();
    await verComo("coordinador");
    render(<PantallaCoordinador />);
    await screen.findByRole("heading", { name: "Teléfonos" });
    expect(
      screen.queryByRole("heading", { name: aljibe.listaTitulo }),
    ).toBeNull();
  });

  it("encendida muestra la tarjeta, guarda el nivel y marca una foto sin fecha", async () => {
    render(
      <>
        <BarraDemo />
        <PantallaSiapa />
      </>,
    );
    const casilla = screen.getByRole("checkbox", {
      name: comun.demo.aljibe,
    }) as HTMLInputElement;
    expect(casilla.checked).toBe(false);
    fireEvent.click(casilla);
    const tarjeta = await screen.findByRole("article", { name: aljibe.titulo });
    expect(tarjeta.textContent).toContain(aljibe.sinReporte);

    const foto = tarjeta.querySelector("input[type=file]") as HTMLInputElement;
    expect(foto.getAttribute("accept")).toBe("image/*");
    expect(foto.getAttribute("capture")).toBe("environment");
    const crudo = jpegSinExif();
    const buffer = new ArrayBuffer(crudo.byteLength);
    new Uint8Array(buffer).set(crudo);
    const archivo = new File([buffer], "aljibe.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(foto, { target: { files: [archivo] } });
    expect(foto.files?.[0]?.name).toBe("aljibe.jpg");

    fireEvent.click(
      within(tarjeta).getByRole("button", { name: aljibe.niveles.medio }),
    );
    expect(
      within(tarjeta)
        .getByRole("button", { name: aljibe.niveles.medio })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      within(tarjeta).getByRole("button", { name: aljibe.guardar }),
    );
    await screen.findByText(aljibe.listo);
    expect(tarjeta.textContent).not.toContain(aljibe.marcas.foto_repetida);
    expect(tarjeta.textContent).toContain(aljibe.marcas.sin_fecha);
    expect(tarjeta.textContent).toContain(aljibe.niveles.medio);

    fireEvent.click(screen.getByRole("button", { name: comun.demo.reiniciar }));
    fireEvent.click(
      screen.getByRole("button", { name: comun.demo.siReiniciar }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("article", { name: aljibe.titulo })).toBeNull(),
    );
    expect(
      (
        screen.getByRole("checkbox", {
          name: comun.demo.aljibe,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("en coordinación lista la casa cuando la bandera está encendida", async () => {
    await verComo("vecino", "7");
    const r = await api.reportar_nivel_aljibe("bajo");
    expect(r.ok).toBe(true);
    await fijarAljibe(true);
    await verComo("coordinador");
    render(<PantallaCoordinador />);
    const lista = await screen.findByRole("region", {
      name: aljibe.listaTitulo,
    });
    expect(within(lista).getByText(aljibe.casa("7"))).toBeTruthy();
    expect(within(lista).getByText(aljibe.niveles.bajo)).toBeTruthy();
  });
});
