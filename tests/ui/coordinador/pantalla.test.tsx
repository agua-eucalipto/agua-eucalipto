// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListaCaseta } from "../../../src/api";
import { api, iniciarApi, verComo } from "../../../src/app/servicios";
import { apiDemo } from "../../../src/app/servicios";
import { PantallaCoordinador } from "../../../src/pantallas/coordinador";
import { comun, coordinador } from "../../../src/textos";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = "ene feb mar abr may jun jul ago sep oct nov dic".split(" ");

/** Formato de 07 armado a mano, sin usar el código de la pantalla. */
function esperadoDe07(l: ListaCaseta): string {
  const d = new Date(l.generada_at);
  const fecha = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dias = (n: number) =>
    n < 1 ? "menos de un día" : n === 1 ? "1 día" : `${n} días`;
  const filas = l.filas.map(
    (f) =>
      `Casa ${f.casa_numero}: ` +
      f.folios
        .map(
          (x) =>
            `${x.codigo} (${
              x.canal === "telefono"
                ? "tel"
                : x.canal === "ayuntamiento"
                  ? "Ayuntamiento"
                  : "WhatsApp"
            }, ${dias(x.dias_que_lleva)})`,
        )
        .join(", "),
  );
  return [
    "*Agua Eucalipto · Folios vigentes*",
    fecha,
    "",
    ...filas,
    `Total: ${l.total_casas} casas, ${l.total_folios} folios`,
  ].join("\n");
}

beforeEach(async () => {
  localStorage.clear();
  await iniciarApi();
  await apiDemo.demo_reiniciar();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function comoCoordinador() {
  await verComo("coordinador");
  render(<PantallaCoordinador />);
  await screen.findByRole("heading", { name: "Lista para caseta" });
}

describe("panel de coordinación", () => {
  it("muestra las tres secciones con los datos de ejemplo", async () => {
    await comoCoordinador();
    expect(
      screen.getByRole("heading", { name: "Solicitudes (2)" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Teléfonos" })).toBeTruthy();
    expect(screen.getByText("Naranjo 8")).toBeTruthy();
    expect(screen.getByText(/55 0000 0099/)).toBeTruthy();
    expect(screen.getByLabelText("Incluir canal")).toBeTruthy();
    expect(screen.getByLabelText("Incluir días que lleva")).toBeTruthy();
    expect(await screen.findByText(/Última lista: /)).toBeTruthy();
    expect(screen.getByText(/Generar la lista no quema folios/)).toBeTruthy();
  });

  it("entrar y cambiar las casillas no registra ningún envío a caseta", async () => {
    const enviosEnBitacora = async () => {
      const r = await api.bitacora(undefined, 200);
      return r.ok
        ? r.datos.filter((e) => e.tipo === "lista_caseta_generada").length
        : -1;
    };
    const generar = vi.spyOn(api, "generar_lista_caseta");
    await comoCoordinador();
    const antes = await enviosEnBitacora();
    expect(antes).toBeGreaterThan(0);
    await screen.findByText(/Última lista: /);
    fireEvent.click(screen.getByLabelText("Incluir canal"));
    fireEvent.click(screen.getByLabelText("Incluir días que lleva"));
    fireEvent.click(screen.getByLabelText("Incluir canal"));
    expect(screen.queryByRole("button", { name: /vista previa/i })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(generar).not.toHaveBeenCalled();
    expect(await enviosEnBitacora()).toBe(antes);
  });

  it("no ofrece sanciones ni reasignaciones (G-INV-6)", async () => {
    await comoCoordinador();
    const botones = screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "");
    expect(botones.join(" | ")).not.toMatch(/sanci|reasign|mover|expuls/i);
  });

  it("imprimir genera la lista, la pinta y abre la impresión", async () => {
    const imprimir = vi.fn();
    vi.stubGlobal("print", imprimir);
    await comoCoordinador();
    fireEvent.click(
      screen.getByRole("button", { name: "Imprimir o guardar PDF" }),
    );
    await waitFor(() => expect(imprimir).toHaveBeenCalledTimes(1));
    const tabla = screen.getByRole("table");
    expect(within(tabla).getAllByRole("row").length).toBeGreaterThan(1);
    expect(screen.getByText(/^Total: \d+ casas?, \d+ folios?$/)).toBeTruthy();
  });

  it("copiar para WhatsApp deja en el portapapeles el texto exacto de 07 (AC-02)", async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: escribir } });
    const original = api.generar_lista_caseta.bind(api);
    let generada: ListaCaseta | null = null;
    vi.spyOn(api, "generar_lista_caseta").mockImplementation(async (o) => {
      const r = await original(o);
      if (r.ok) generada = r.datos;
      return r;
    });
    await comoCoordinador();
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar para WhatsApp" }),
    );
    await screen.findByText("Copiado");
    expect(escribir).toHaveBeenCalledTimes(1);
    expect(generada).not.toBeNull();
    expect(escribir.mock.calls[0]![0]).toBe(esperadoDe07(generada!));
  });

  it("copiar sin canal ni días copia solo los códigos", async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: escribir } });
    await comoCoordinador();
    fireEvent.click(screen.getByLabelText("Incluir canal"));
    fireEvent.click(screen.getByLabelText("Incluir días que lleva"));
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar para WhatsApp" }),
    );
    await screen.findByText("Copiado");
    const lineas = (escribir.mock.calls[0]![0] as string).split("\n");
    expect(lineas[0]).toBe("*Agua Eucalipto · Folios vigentes*");
    expect(lineas[2]).toBe("");
    for (const l of lineas.slice(3, -1))
      expect(l).toMatch(/^Casa \S+: [^()]+$/);
    expect(lineas.at(-1)).toMatch(/^Total: \d+ casas?, \d+ folios?$/);
  });

  it("si no se puede copiar, muestra el texto para copiarlo a mano", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
    });
    await comoCoordinador();
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar para WhatsApp" }),
    );
    await screen.findByText(coordinador.caseta.noCopiado);
    const area = screen.getByLabelText(
      "Texto para WhatsApp",
    ) as HTMLTextAreaElement;
    expect(area.value.startsWith("*Agua Eucalipto")).toBe(true);
  });

  it("generar la lista no cambia ningún folio (C-05)", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    await verComo("coordinador");
    const antes = await api.listar_folios_casa();
    render(<PantallaCoordinador />);
    await screen.findByRole("heading", { name: "Lista para caseta" });
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar para WhatsApp" }),
    );
    await screen.findByText("Copiado");
    // Solo cambia la marca de "enviado a caseta"; el estado no se toca.
    const sinEnvio = (r: Awaited<typeof antes>) =>
      r.ok ? r.datos.map((f) => ({ ...f, ultimo_envio_caseta_at: null })) : r;
    expect(sinEnvio(await api.listar_folios_casa())).toEqual(sinEnvio(antes));
  });

  it("aprobar pide la casa y saca la solicitud de la lista", async () => {
    await comoCoordinador();
    const tarjeta = screen.getByText("Naranjo 8").closest("article")!;
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Aprobar" }));
    const campo = (await screen.findByLabelText(
      "Número de casa",
    )) as HTMLInputElement;
    expect(campo.value).toBe("8");
    fireEvent.input(campo, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Sí, aprobar" }));
    await screen.findByText("Falta el número de casa.");
    fireEvent.input(campo, { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Sí, aprobar" }));
    await screen.findByText("Listo. La solicitud quedó aprobada.");
    await screen.findByRole("heading", { name: "Solicitudes (1)" });
    expect(screen.queryByText("Naranjo 8")).toBeNull();
  });

  it("rechazar pide confirmación", async () => {
    await comoCoordinador();
    const tarjeta = screen.getByText("Eucalipto 10").closest("article")!;
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Rechazar" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Sí, rechazar" }),
    );
    await screen.findByText("Listo. La solicitud quedó rechazada.");
    await screen.findByRole("heading", { name: "Solicitudes (1)" });
  });

  it("reiniciar teléfono muestra la confirmación del texto aprobado", async () => {
    await comoCoordinador();
    const fila = screen.getByText(/55 0000 0007/).closest("li")!;
    fireEvent.click(
      within(fila).getByRole("button", { name: "Reiniciar teléfono" }),
    );
    expect(
      await screen.findByText(
        "La persona tendrá que volver a entrar y crear su PIN",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sí, reiniciar" }));
    await screen.findByText(coordinador.telefonos.listo);
    const telefonos = await api.listar_telefonos();
    expect(
      telefonos.ok &&
        telefonos.datos.find((t) => t.numero === "5500000007")?.tiene_pin,
    ).toBe(false);
  });
});

describe("sin permiso (AC-03)", () => {
  it("con sesión de vecino la pantalla no muestra nada de la sección", async () => {
    await verComo("vecino", "7");
    render(<PantallaCoordinador />);
    await screen.findByText(comun.noAutorizado);
    expect(screen.queryByText("Lista para caseta")).toBeNull();
    expect(screen.queryByText(/Solicitudes/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/55 0000 00\d\d/);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("la Api rechaza al vecino en todas las operaciones de coordinador", async () => {
    await verComo("vecino", "7");
    const opciones = { canal: true, dias: true, formato: "imprimir" } as const;
    const respuestas = await Promise.all([
      api.generar_lista_caseta(opciones),
      api.listar_solicitudes(),
      api.listar_telefonos(),
      api.resolver_solicitud("x", true, "1"),
      api.reiniciar_telefono("5500000007"),
    ]);
    for (const r of respuestas) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("NO_AUTORIZADO");
    }
  });

  it("sin sesión tampoco hay acceso", async () => {
    await verComo("otra_calle");
    render(<PantallaCoordinador />);
    await screen.findByText(comun.noAutorizado);
  });

  it("si la sesión pierde el permiso a medio uso, la sección se cierra", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    await comoCoordinador();
    await verComo("vecino", "7");
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar para WhatsApp" }),
    );
    await screen.findByText(comun.noAutorizado);
    expect(screen.queryByText("Lista para caseta")).toBeNull();
  });
});
