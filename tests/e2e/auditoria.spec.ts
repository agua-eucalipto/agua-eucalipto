import { expect, test, type Page } from "@playwright/test";
import {
  abrirDemo,
  adelantar,
  capturar,
  exigirFormatoWhatsApp,
  guardarJson,
  irA,
  medir,
  pasarIntro,
  textoLista,
  verCoordinador,
  verVecino,
  type Medicion,
} from "./apoyo";

type Toma = Medicion & {
  proyecto: string;
  dia: number;
  pantalla: string;
  captura: string;
};

function defectosDe(toma: Toma): string[] {
  const donde = `${toma.proyecto} día +${toma.dia} ${toma.pantalla}`;
  const lista: string[] = [];
  if (toma.desbordePagina) {
    lista.push(
      `${donde}: desborde de página ${toma.anchoScroll} > ${toma.anchoCliente}`,
    );
  }
  for (const recorte of toma.recortes.filter((r) => r.tipo === "interno")) {
    lista.push(`${donde}: desborde interno en ${recorte.selector}`);
  }
  for (const toque of toma.toques) {
    lista.push(
      `${donde}: toque ${toque.ancho}×${toque.alto} en ${toque.selector}`,
    );
  }
  for (const contraste of toma.contrastes) {
    lista.push(
      `${donde}: contraste ${contraste.ratio}:1 < ${contraste.minimo}:1 (${contraste.fg} sobre ${contraste.bg}) «${contraste.texto}»`,
    );
  }
  for (const frase of toma.siapa)
    lista.push(`${donde}: SIAPA fuera de origen «${frase}»`);
  for (const frase of toma.administracion) {
    lista.push(`${donde}: administración «${frase}»`);
  }
  return lista;
}

async function esperarPantalla(page: Page, pantalla: string): Promise<void> {
  if (
    pantalla === "aviso" ||
    pantalla === "tutorial" ||
    pantalla === "otra-calle"
  ) {
    await expect(page.locator(".capa")).toBeVisible();
    return;
  }
  if (pantalla === "folios") {
    await expect(page.getByRole("article").first()).toBeVisible();
    return;
  }
  if (pantalla === "pipas") {
    await expect(
      page.getByRole("heading", { name: "Viajes abiertos" }),
    ).toBeVisible();
    return;
  }
  if (pantalla === "info") {
    await expect(page.locator(".bitacora li").first()).toBeVisible();
    return;
  }
  if (pantalla === "coordinacion") {
    await expect(
      page.getByRole("heading", { name: "Lista para caseta" }),
    ).toBeVisible();
  }
}

async function tomar(
  page: Page,
  proyecto: string,
  dia: number,
  pantalla: string,
): Promise<Toma> {
  await esperarPantalla(page, pantalla);
  await abrirDemo(page);
  const medida = await medir(page);
  const captura = `capturas/${proyecto}/dia-${dia}/${pantalla}.png`;
  await capturar(page, captura);
  return { ...medida, proyecto, dia, pantalla, captura };
}

test("mide desborde, toque, contraste y menciones en cada pantalla y día", async ({
  page,
}, info) => {
  const proyecto = info.project.name;
  const tomas: Toma[] = [];

  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Antes de empezar" }),
    ).toBeVisible();
    tomas.push(await tomar(page, proyecto, 0, "aviso"));
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(
      page.getByRole("heading", { name: "Cómo funciona" }),
    ).toBeVisible();
    tomas.push(await tomar(page, proyecto, 0, "tutorial"));
    await page.getByRole("button", { name: "Saltar" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Folios SIAPA" }),
    ).toBeVisible();
    tomas.push(await tomar(page, proyecto, 0, "folios"));
    await irA(page, "Pipas privadas");
    tomas.push(await tomar(page, proyecto, 0, "pipas"));
    await irA(page, "Información");
    tomas.push(await tomar(page, proyecto, 0, "info"));
    await verCoordinador(page);
    tomas.push(await tomar(page, proyecto, 0, "coordinacion"));
    await (
      await abrirDemo(page)
    )
      .getByRole("button", { name: "Vecino de otra calle" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Esta lista es solo para la calle Eucalipto",
      }),
    ).toBeVisible();
    tomas.push(await tomar(page, proyecto, 0, "otra-calle"));
    await (
      await abrirDemo(page)
    )
      .getByRole("button", { name: "Vecino", exact: true })
      .click();
    await verVecino(page, "7", "SIAPAZAP20261001");

    for (const dia of [1, 2, 3]) {
      await adelantar(page, dia);
      await verVecino(page, "7", dia === 1 ? "SIAPAZAP20261001" : "116245001");
      tomas.push(await tomar(page, proyecto, dia, "folios"));
      await irA(page, "Pipas privadas");
      tomas.push(await tomar(page, proyecto, dia, "pipas"));
      await irA(page, "Información");
      tomas.push(await tomar(page, proyecto, dia, "info"));
      await verCoordinador(page);
      tomas.push(await tomar(page, proyecto, dia, "coordinacion"));
      await verVecino(page, "7", dia === 1 ? "SIAPAZAP20261001" : "116245001");
    }
  } finally {
    if (tomas.length > 0) guardarJson(`mediciones-${proyecto}.json`, tomas);
  }
  for (const toma of tomas) {
    expect(toma.textosRevisados, toma.pantalla).toBeGreaterThan(5);
    expect(toma.controlesRevisados, toma.pantalla).toBeGreaterThan(0);
  }
  expect(tomas.flatMap(defectosDe)).toEqual([]);
});

test("la lista impresa cabe en carta y el texto copiado trae el formato", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "1280",
    "La hoja carta no depende del ancho del proyecto.",
  );
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.imprimio = "1";
    };
  });
  await pasarIntro(page);
  const lista = await textoLista(page);
  exigirFormatoWhatsApp(lista);
  expect(lista).toContain("SIAPAZAP20261001");
  expect(lista).toContain("116245010");
  expect(lista).not.toContain("SIAPAZAP20260980");
  expect(lista).toContain("Total: 5 casas, 9 folios");

  await page.getByRole("button", { name: "Imprimir o guardar PDF" }).click();
  await expect
    .poll(() => page.locator("html").getAttribute("data-imprimio"))
    .toBe("1");

  const margen = (18 * 96) / 25.4;
  const ancho = Math.floor(8.5 * 96 - 2 * margen);
  const alto = Math.floor(11 * 96 - 2 * margen);
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: ancho, height: alto });

  await expect(page.locator(".barra-demo")).toBeHidden();
  await expect(page.locator(".encabezado")).toBeHidden();
  await expect(page.locator(".coordinador-lateral")).toBeHidden();
  await expect(
    page.getByText("Agua Eucalipto · Folios vigentes"),
  ).toBeVisible();
  await expect(page.locator(".caseta table")).toBeVisible();

  const medida = await page
    .locator(".tabla td")
    .first()
    .evaluate((el) => {
      const estilo = getComputedStyle(el);
      return {
        fuente: estilo.fontSize,
        color: estilo.color,
        fondo: estilo.backgroundColor,
      };
    });
  const altoLista = await page
    .locator(".caseta")
    .evaluate((el) => el.scrollHeight);
  const desborde = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    cliente: document.documentElement.clientWidth,
  }));
  await capturar(page, "capturas/carta/lista.png");
  guardarJson("impresion.json", {
    ancho,
    alto,
    altoLista,
    desborde,
    medida,
    texto: lista,
  });

  expect(Number.parseFloat(medida.fuente)).toBeGreaterThanOrEqual(18);
  expect(medida.color).toBe("rgb(0, 0, 0)");
  expect(desborde.scroll).toBeLessThanOrEqual(desborde.cliente + 1);
  expect(altoLista).toBeLessThanOrEqual(alto);
});
