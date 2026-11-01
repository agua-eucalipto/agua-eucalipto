import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { raizEvidencia } from "./destino";

export type Recorte = {
  tipo: "pagina" | "interno";
  selector: string;
  texto: string;
};

export type Toque = { selector: string; ancho: number; alto: number };

export type Contraste = {
  texto: string;
  selector: string;
  fg: string;
  bg: string;
  ratio: number;
  minimo: number;
  fontSize: number;
  peso: number;
  veces: number;
};

export type Medicion = {
  desbordePagina: boolean;
  anchoCliente: number;
  anchoScroll: number;
  recortes: Recorte[];
  internos: number;
  toques: Toque[];
  toquesTotal: number;
  contrastes: Contraste[];
  contrastesTotal: number;
  textosRevisados: number;
  controlesRevisados: number;
  siapa: string[];
  administracion: string[];
};

const FECHA_LISTA =
  /^(dom|lun|mar|mié|jue|vie|sáb) \d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) \d{4}, \d{1,2}:\d{2}$/;

const LINEA_CASA =
  /^Casa \d+: (?:SIAPAZAP\d+|1162\d+|\d{4}) \((?:WhatsApp|tel|Ayuntamiento), [^)]+\)(?:, (?:SIAPAZAP\d+|1162\d+|\d{4}) \((?:WhatsApp|tel|Ayuntamiento), [^)]+\))*$/;

export function demo(page: Page): Locator {
  return page.getByRole("region", { name: "Controles del demo" });
}

export function enlace(page: Page, nombre: string): Locator {
  return page
    .getByRole("link", { name: nombre, exact: true })
    .locator("visible=true");
}

/** Abre la barra en pantallas chicas, donde los controles nacen plegados. */
export async function abrirDemo(page: Page): Promise<Locator> {
  const barra = demo(page);
  const plegar = barra.getByRole("button", { name: "Demo", exact: true });
  if (await plegar.isVisible()) {
    if ((await plegar.getAttribute("aria-expanded")) !== "true") {
      await plegar.click();
    }
  }
  await expect(
    barra.getByRole("button", { name: "Adelantar 1 día" }),
  ).toBeVisible();
  return barra;
}

export async function pasarIntro(page: Page): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Antes de empezar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendido" }).click();
  await expect(
    page.getByRole("heading", { name: "Cómo funciona" }),
  ).toBeVisible();
  await expect(page.getByText("Registra tus folios del SIAPA")).toBeVisible();
  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Folios SIAPA" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Folio SIAPAZAP20261001" }),
  ).toBeVisible();
}

export async function irA(
  page: Page,
  nombre: "Folios SIAPA" | "Pipas privadas" | "Coordinación" | "Información",
): Promise<void> {
  await enlace(page, nombre).click();
  await expect(
    page.getByRole("heading", { level: 1, name: nombre }),
  ).toBeVisible();
}

export async function verVecino(
  page: Page,
  casa: string,
  folio: string,
): Promise<void> {
  const barra = await abrirDemo(page);
  await barra.getByRole("button", { name: "Vecino", exact: true }).click();
  const seleccion = barra.getByRole("combobox", { name: "Casa", exact: true });
  await expect(seleccion).toBeVisible();
  if ((await seleccion.inputValue()) !== casa) {
    await seleccion.selectOption(casa);
  }
  await irA(page, "Folios SIAPA");
  await expect(
    page.getByRole("article", { name: `Folio ${folio}` }),
  ).toBeVisible();
}

export async function verCoordinador(page: Page): Promise<void> {
  const barra = await abrirDemo(page);
  await barra.getByRole("button", { name: "Coordinador", exact: true }).click();
  await irA(page, "Coordinación");
  await expect(
    page.getByRole("heading", { name: "Lista para caseta" }),
  ).toBeVisible();
}

export async function adelantar(page: Page, dias: number): Promise<void> {
  const barra = await abrirDemo(page);
  await barra.getByRole("button", { name: "Adelantar 1 día" }).click();
  await expect(barra).toContainText(`Día +${dias}`);
}

export async function reloj(page: Page): Promise<string> {
  const barra = await abrirDemo(page);
  const texto = await barra.locator(".barra-demo__dia").innerText();
  return texto.replace(/,?\s*\d{1,2}:\d{2}\s*$/, "").trim();
}

export async function sinErrorGenerico(page: Page): Promise<void> {
  await expect(page.getByText("Algo no salió como esperábamos")).toHaveCount(0);
}

/** Texto de WhatsApp tal como lo entrega el botón de copiar, o el área de respaldo. */
export async function textoLista(page: Page): Promise<string> {
  await verCoordinador(page);
  await page.getByRole("button", { name: "Copiar para WhatsApp" }).click();
  const copiado = page.getByText("Copiado", { exact: true });
  const manual = page.getByRole("textbox", { name: "Texto para WhatsApp" });
  await expect(copiado.or(manual)).toBeVisible();
  if (await copiado.isVisible()) {
    return page.evaluate(() => navigator.clipboard.readText());
  }
  return manual.inputValue();
}

export function exigirFormatoWhatsApp(texto: string): void {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  expect(lineas[0], texto).toBe("*Agua Eucalipto · Folios vigentes*");
  expect(lineas[1], texto).toMatch(FECHA_LISTA);
  expect(lineas[2], texto).toBe("");
  const casas = lineas.slice(3, -1);
  expect(casas.length, texto).toBeGreaterThan(0);
  for (const linea of casas) {
    expect(linea, texto).toMatch(LINEA_CASA);
  }
  expect(lineas[lineas.length - 1], texto).toMatch(
    /^Total: \d+ casas, \d+ folios$/,
  );
}

export async function medir(page: Page): Promise<Medicion> {
  return page.evaluate(() => {
    type Color = { r: number; g: number; b: number; a: number };

    const parsear = (valor: string): Color | null => {
      const m = valor.match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/,
      );
      if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined)
        return null;
      const alfa = m[4];
      let a = 1;
      if (alfa !== undefined) {
        a = alfa.endsWith("%") ? Number(alfa.slice(0, -1)) / 100 : Number(alfa);
      }
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
    };

    const mezclar = (frente: Color, fondo: Color): Color => ({
      r: frente.r * frente.a + fondo.r * (1 - frente.a),
      g: frente.g * frente.a + fondo.g * (1 - frente.a),
      b: frente.b * frente.a + fondo.b * (1 - frente.a),
      a: 1,
    });

    const canal = (c: number): number => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };

    const luminancia = (color: Color): number =>
      0.2126 * canal(color.r) +
      0.7152 * canal(color.g) +
      0.0722 * canal(color.b);

    const ratioDe = (a: number, b: number): number => {
      const claro = Math.max(a, b);
      const oscuro = Math.min(a, b);
      return (claro + 0.05) / (oscuro + 0.05);
    };

    const hex = (color: Color): string => {
      const parte = (n: number) => Math.round(n).toString(16).padStart(2, "0");
      return `#${parte(color.r)}${parte(color.g)}${parte(color.b)}`;
    };

    const visible = (el: Element): boolean => {
      if (el.closest("[inert]")) return false;
      const estilo = getComputedStyle(el);
      if (
        estilo.display === "none" ||
        estilo.visibility === "hidden" ||
        Number(estilo.opacity) === 0
      ) {
        return false;
      }
      if (el.getClientRects().length === 0) return false;
      const caja = el.getBoundingClientRect();
      return (
        caja.width >= 2 && caja.height >= 2 && caja.bottom > 0 && caja.right > 0
      );
    };

    const ruta = (el: Element): string => {
      const id = el.id ? `#${el.id}` : "";
      const clase = [...el.classList].slice(0, 3).join(".");
      const nombre = (el.getAttribute("aria-label") ?? el.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50);
      return `${el.tagName.toLowerCase()}${id}${clase ? `.${clase}` : ""} «${nombre}»`;
    };

    const fondoDe = (el: Element): Color => {
      const capas: Color[] = [];
      let nodo: Element | null = el;
      while (nodo) {
        const fondo = parsear(getComputedStyle(nodo).backgroundColor);
        if (fondo && fondo.a > 0.01) capas.push(fondo);
        if (fondo && fondo.a >= 0.99) break;
        nodo = nodo.parentElement;
      }
      const blanco: Color = { r: 255, g: 255, b: 255, a: 1 };
      if (capas.length === 0) return blanco;
      let base = capas[capas.length - 1] ?? blanco;
      if (base.a < 0.99) base = mezclar(base, blanco);
      for (let i = capas.length - 2; i >= 0; i -= 1) {
        const capa = capas[i];
        if (capa) base = mezclar(capa, base);
      }
      return base;
    };

    const contrastes: {
      texto: string;
      selector: string;
      fg: string;
      bg: string;
      ratio: number;
      minimo: number;
      fontSize: number;
      peso: number;
      veces: number;
    }[] = [];
    const porClave = new Map<string, (typeof contrastes)[number]>();
    let textosRevisados = 0;
    const trozos: string[] = [];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let nodo = walker.nextNode();
    while (nodo) {
      const crudo = nodo.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const padre = nodo.parentElement;
      if (crudo && padre && visible(padre) && padre.closest("svg") === null) {
        textosRevisados += 1;
        trozos.push(crudo);
        const estilo = getComputedStyle(padre);
        const tinta = parsear(estilo.color);
        const fondo = fondoDe(padre);
        if (tinta) {
          const efectivo = tinta.a >= 0.99 ? tinta : mezclar(tinta, fondo);
          const ratio = ratioDe(luminancia(efectivo), luminancia(fondo));
          const size = Number.parseFloat(estilo.fontSize);
          const peso = Number(estilo.fontWeight) || 400;
          const grande = size >= 24 || (size >= 18.66 && peso >= 700);
          const minimo = grande ? 3 : 4.5;
          if (ratio + 0.01 < minimo) {
            const redondo = Math.round(ratio * 100) / 100;
            const clave = `${hex(efectivo)}|${hex(fondo)}|${minimo}|${Math.round(size)}|${peso}`;
            const previo = porClave.get(clave);
            if (previo) {
              previo.veces += 1;
            } else {
              const hallazgo = {
                texto: crudo.slice(0, 80),
                selector: ruta(padre),
                fg: hex(efectivo),
                bg: hex(fondo),
                ratio: redondo,
                minimo,
                fontSize: Math.round(size * 10) / 10,
                peso,
                veces: 1,
              };
              porClave.set(clave, hallazgo);
              contrastes.push(hallazgo);
            }
          }
        }
      }
      nodo = walker.nextNode();
    }

    for (const el of document.querySelectorAll("[aria-label], [alt]")) {
      if (!visible(el)) continue;
      const etiqueta =
        el.getAttribute("aria-label") ?? el.getAttribute("alt") ?? "";
      if (etiqueta.trim()) trozos.push(etiqueta.trim());
    }
    trozos.push(document.title);
    const visibleTexto = trozos.join("\n");

    let resto = visibleTexto.replace(/SIAPAZAP\d*/gi, "");
    // Textos aprobados que aclaran que la lista no es del SIAPA ni de la administración.
    for (const frase of [
      "No tiene relación con el SIAPA ni con la administración del coto.",
      "puede pedirlo a la administración.",
      "Folios SIAPA",
      "folios del SIAPA",
      "Folios del SIAPA",
      "Registra tus folios del SIAPA",
      "WhatsApp del SIAPA",
      "Teléfono del SIAPA",
      "teléfono del SIAPA",
    ]) {
      resto = resto.split(frase).join("");
    }
    const siapa: string[] = [];
    const reSiapa = /SIAPA/g;
    for (
      let hallazgo = reSiapa.exec(resto);
      hallazgo;
      hallazgo = reSiapa.exec(resto)
    ) {
      const i = hallazgo.index;
      siapa.push(
        resto
          .slice(Math.max(0, i - 42), i + 48)
          .replace(/\s+/g, " ")
          .trim(),
      );
    }
    const administracion: string[] = [];
    const reAdmin = /administraci[oó]n/gi;
    for (
      let hallazgo = reAdmin.exec(resto);
      hallazgo;
      hallazgo = reAdmin.exec(resto)
    ) {
      const i = hallazgo.index;
      administracion.push(
        resto
          .slice(Math.max(0, i - 42), i + 48)
          .replace(/\s+/g, " ")
          .trim(),
      );
    }

    const raiz = document.documentElement;
    const desbordePagina = raiz.scrollWidth > raiz.clientWidth + 1;
    const recortes: {
      tipo: "pagina" | "interno";
      selector: string;
      texto: string;
    }[] = [];
    if (desbordePagina) {
      for (const el of document.querySelectorAll("body *")) {
        if (!visible(el)) continue;
        const caja = el.getBoundingClientRect();
        if (caja.right <= raiz.clientWidth + 1) continue;
        const hijoSale = [...el.children].some(
          (hijo) => hijo.getBoundingClientRect().right > raiz.clientWidth + 1,
        );
        if (hijoSale) continue;
        recortes.push({
          tipo: "pagina",
          selector: ruta(el),
          texto: (el.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80),
        });
        if (recortes.length >= 12) break;
      }
    }
    let internos = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (el === document.body || !visible(el)) continue;
      const ox = getComputedStyle(el).overflowX;
      if (ox !== "hidden" && ox !== "clip" && ox !== "auto" && ox !== "scroll")
        continue;
      if (el.scrollWidth <= el.clientWidth + 1) continue;
      const texto = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!texto) continue;
      internos += 1;
      if (recortes.length < 20) {
        recortes.push({
          tipo: "interno",
          selector: ruta(el),
          texto: texto.slice(0, 80),
        });
      }
    }

    const toques: { selector: string; ancho: number; alto: number }[] = [];
    let controlesRevisados = 0;
    for (const el of document.querySelectorAll(
      "button, a[href], input, select, textarea, summary",
    )) {
      if (!(el instanceof HTMLElement)) continue;
      if (el instanceof HTMLInputElement && el.type === "hidden") continue;
      if (!visible(el)) continue;
      let caja = el.getBoundingClientRect();
      if (
        el instanceof HTMLInputElement &&
        (el.type === "checkbox" || el.type === "radio")
      ) {
        const etiqueta =
          el.closest("label") ??
          (el.id
            ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
            : null);
        if (etiqueta) caja = etiqueta.getBoundingClientRect();
      }
      controlesRevisados += 1;
      if (caja.width < 47.5 || caja.height < 47.5) {
        toques.push({
          selector: ruta(el),
          ancho: Math.round(caja.width * 10) / 10,
          alto: Math.round(caja.height * 10) / 10,
        });
      }
    }

    return {
      desbordePagina,
      anchoCliente: raiz.clientWidth,
      anchoScroll: raiz.scrollWidth,
      recortes,
      internos,
      toques: toques.slice(0, 25),
      toquesTotal: toques.length,
      contrastes: contrastes.slice(0, 25),
      contrastesTotal: contrastes.length,
      textosRevisados,
      controlesRevisados,
      siapa: [...new Set(siapa)].slice(0, 12),
      administracion: [...new Set(administracion)].slice(0, 12),
    };
  });
}

export async function capturar(page: Page, relativa: string): Promise<void> {
  const destino = join(raizEvidencia(), relativa);
  mkdirSync(dirname(destino), { recursive: true });
  const capa = page.locator(".capa");
  if ((await capa.count()) > 0 && (await capa.first().isVisible())) {
    await capa.first().screenshot({ path: destino, animations: "disabled" });
    return;
  }
  await page.screenshot({
    path: destino,
    fullPage: true,
    animations: "disabled",
  });
}

export function guardarJson(nombre: string, datos: unknown): void {
  const destino = join(raizEvidencia(), nombre);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `${JSON.stringify(datos, null, 2)}\n`);
}
