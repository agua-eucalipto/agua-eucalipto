// @vitest-environment happy-dom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { TIPOS_EVENTO } from "../../../src/api";
import { PantallaInfo } from "../../../src/pantallas/info";
import { TAMANO_PAGINA } from "../../../src/pantallas/info/Bitacora";
import {
  hace,
  proteger,
  queHizo,
  quien,
} from "../../../src/pantallas/info/bitacora-texto";
import { info } from "../../../src/textos";
import { api, datosSensibles, prepararDemo, verComo } from "./ayudas";

const t = info;

function textoBitacora(): string {
  const lista = document.querySelector("ol.bitacora");
  return lista?.textContent ?? "";
}

describe("Información", () => {
  prepararDemo({ introduccionVista: true });

  it("muestra resumen, reglas, bitácora y privacidad", async () => {
    render(<PantallaInfo />);
    for (const titulo of Object.values(t.secciones)) {
      expect(
        screen.getByRole("heading", { level: 2, name: titulo }),
      ).toBeTruthy();
    }
    expect(screen.getByText(t.resumen.queEs.titulo)).toBeTruthy();
    expect(screen.getByText(t.resumen.porQue.texto)).toBeTruthy();
    expect(screen.getByText(t.reglas.folios.lista[3]!)).toBeTruthy();
    expect(screen.getByText(t.reglas.pipas.lista[0]!)).toBeTruthy();
    for (const linea of t.privacidad.lineas) {
      expect(screen.getByText(linea)).toBeTruthy();
    }
    await waitFor(() =>
      expect(document.querySelector("ol.bitacora")).toBeTruthy(),
    );
  });

  it("pagina la bitácora: los más nuevos primero y «Ver más» agrega los siguientes", async () => {
    render(<PantallaInfo />);
    await waitFor(() =>
      expect(document.querySelectorAll(".bitacora__evento")).toHaveLength(
        TAMANO_PAGINA,
      ),
    );
    const todos = await api.bitacora(undefined, 1000);
    if (!todos.ok) throw new Error("sin bitácora");
    expect(todos.datos.length).toBeGreaterThan(TAMANO_PAGINA);
    const primero = document.querySelector(".bitacora__evento")!;
    expect(primero.textContent).toContain(quien(todos.datos[0]!));

    fireEvent.click(screen.getByRole("button", { name: t.bitacora.verMas }));
    await waitFor(() =>
      expect(
        document.querySelectorAll(".bitacora__evento").length,
      ).toBeGreaterThan(TAMANO_PAGINA),
    );
    expect(document.querySelectorAll(".bitacora__evento")).toHaveLength(
      Math.min(todos.datos.length, TAMANO_PAGINA * 2),
    );
  });

  it("sin casa pide entrar en vez de mostrar la bitácora", async () => {
    await verComo("otra_calle");
    render(<PantallaInfo />);
    expect(screen.getByText(t.bitacora.sinSesion)).toBeTruthy();
    expect(document.querySelector("ol.bitacora")).toBeNull();
  });

  it("los botones del índice miden al menos 48 px de alto en CSS (clase btn)", () => {
    render(<PantallaInfo />);
    const indice = screen.getByRole("navigation", { name: "En esta pantalla" });
    expect(within(indice).getAllByRole("link")).toHaveLength(4);
  });
});

describe("AC-03 · la bitácora nunca muestra un folio completo ni un teléfono", () => {
  prepararDemo({ introduccionVista: true });

  it("con todos los eventos de la semilla en pantalla", async () => {
    const { telefonos, folios } = await datosSensibles();
    expect(telefonos.length).toBeGreaterThan(20);
    expect(folios.length).toBeGreaterThan(5);

    render(<PantallaInfo />);
    const todos = await api.bitacora(undefined, 10_000);
    if (!todos.ok) throw new Error("sin bitácora");
    const total = todos.datos.length;
    expect(total).toBeGreaterThan(TAMANO_PAGINA);

    // Carga todas las páginas.
    for (;;) {
      await waitFor(() =>
        expect(screen.queryByText(t.bitacora.cargando)).toBeNull(),
      );
      const mas = screen.queryByRole("button", { name: t.bitacora.verMas });
      if (!mas) break;
      fireEvent.click(mas);
    }
    expect(document.querySelectorAll(".bitacora__evento")).toHaveLength(total);

    const texto = textoBitacora();
    for (const codigo of folios) {
      expect(texto).not.toContain(codigo);
    }
    for (const telefono of telefonos) {
      const bonito = `${telefono.slice(0, 2)} ${telefono.slice(2, 6)} ${telefono.slice(6)}`;
      expect(texto).not.toContain(telefono);
      expect(texto).not.toContain(bonito);
    }
    expect(texto).not.toMatch(/(SIAPAZAP|1162)\d{5,}/i);
    expect(texto).not.toMatch(/\d{10}/);
    // Sí se ven folios enmascarados.
    expect(texto).toMatch(/SIAPAZAP••••\d{4}/);
  });

  it("aunque la Api entregara un folio completo o un teléfono, no llegan a la pantalla", () => {
    expect(proteger("SIAPAZAP20261001")).toBe("SIAPAZAP••••1001");
    expect(proteger("1162123456")).toBe("1162••••3456");
    expect(proteger("llamó al 55 0000 0007")).toBe("llamó al ••••");
    expect(proteger("+52 5500000007")).toBe("••••");
    const evento = {
      id: 1,
      ocurrido_at: 0,
      casa_numero: "5500000007",
      rol: "vecino" as const,
      tipo: "folio_registrado" as const,
      detalle: { folio: "SIAPAZAP20261001", canal: "whatsapp" },
    };
    expect(queHizo(evento)).toContain("SIAPAZAP••••1001");
    expect(queHizo(evento)).not.toContain("SIAPAZAP20261001");
    expect(quien(evento)).not.toContain("5500000007");
    expect(quien({ ...evento, casa_numero: null })).toBe(t.bitacora.alguien);
    expect(quien({ ...evento, rol: "sistema", casa_numero: null })).toBe(
      t.bitacora.sistema,
    );
  });

  it("todos los tipos de evento tienen texto propio y ninguno cae en el genérico", () => {
    for (const tipo of TIPOS_EVENTO) {
      const texto = queHizo({
        id: 1,
        ocurrido_at: 0,
        casa_numero: "7",
        rol: "vecino",
        tipo,
        detalle: {},
      });
      expect(texto, tipo).not.toBe(t.bitacora.otro);
      expect(texto.length, tipo).toBeGreaterThan(5);
    }
    expect(
      queHizo({
        id: 1,
        ocurrido_at: 0,
        casa_numero: null,
        rol: "sistema",
        tipo: "nuevo_tipo" as never,
        detalle: {},
      }),
    ).toBe(t.bitacora.otro);
  });

  it("el tiempo relativo usa minutos, horas y días", () => {
    const ahora = 10 * 24 * 3_600_000;
    expect(hace(ahora, ahora)).toBe(t.bitacora.ahora);
    expect(hace(ahora - 5 * 60_000, ahora)).toBe("hace 5 min");
    expect(hace(ahora - 2 * 3_600_000, ahora)).toBe("hace 2 h");
    expect(hace(ahora - 72 * 3_600_000, ahora)).toBe("hace 3 días");
  });
});
