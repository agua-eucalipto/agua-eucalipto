import { expect, test } from "@playwright/test";
import {
  abrirDemo,
  adelantar,
  demo,
  exigirFormatoWhatsApp,
  irA,
  reloj,
  sinErrorGenerico,
  textoLista,
  verCoordinador,
} from "./apoyo";

const TEL = "1162999111";
const WHATSAPP = "SIAPAZAP20268888";

test("el guion de presentación se completa sin estados de error", async ({
  page,
}) => {
  const inicio = await test.step("Aviso de entrada y resumen", async () => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Antes de empezar" }),
    ).toBeVisible();
    await expect(
      page.getByText("no garantiza que te llegue agua"),
    ).toBeVisible();
    await expect(page.getByText("se aplican solas")).toBeVisible();
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(
      page.getByRole("heading", { name: "Cómo funciona" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Saltar" }).click();
    await irA(page, "Información");
    await expect(page.getByText("Un pizarrón compartido")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /WhatsApp del Gobierno de Zapopan/ }),
    ).toHaveAttribute("href", "https://wa.me/523338182222");
    await expect(
      page.getByRole("link", { name: /Teléfono del SIAPA/ }),
    ).toHaveAttribute("href", "tel:+523336682482");
    await expect(
      page.getByText(
        "otras calles pueden usarlo con sus propios coordinadores.",
      ),
    ).toBeVisible();
    await irA(page, "Folios SIAPA");
    const marca = await reloj(page);
    await sinErrorGenerico(page);
    return marca;
  });

  await test.step("Vecino de la casa 7: folios, tope y folio repetido", async () => {
    const hoy = page.getByRole("article", { name: "Folio SIAPAZAP20261001" });
    await expect(hoy).toContainText(/Lleva \d+ d[ií]a/);
    await expect(hoy).toContainText("Vence hoy");
    await expect(
      page.getByRole("article", { name: "Folio 116245001" }),
    ).toContainText("Lleva 1 día");

    await page.getByRole("button", { name: "Registrar folio" }).click();
    const alta = page.getByRole("dialog", { name: "Registrar folio" });
    await alta.getByLabel("Folio").fill("2403");
    await expect(alta.getByText("Ayuntamiento de Zapopan")).toBeVisible();
    await expect(
      alta.getByRole("link", { name: /WhatsApp del SIAPA/ }),
    ).toHaveAttribute("href", "https://wa.me/523351644440");
    await alta.getByLabel("Folio").fill(TEL);
    await alta.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(
      page.getByText(`Listo, registramos el folio ${TEL}.`),
    ).toBeVisible();

    await page.getByRole("button", { name: "Registrar folio" }).click();
    const tope = page.getByRole("dialog", { name: "Registrar folio" });
    await tope.getByLabel("Folio").fill(WHATSAPP);
    await tope.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(tope.getByText("¿Cuál reemplaza este nuevo?")).toBeVisible();
    await tope
      .getByRole("button", { name: "Reemplazar SIAPAZAP20260950" })
      .click();
    await tope.getByRole("button", { name: "Sí, reemplazar" }).click();
    await expect(
      page.getByText(`Listo, ${WHATSAPP} quedó en su lugar.`),
    ).toBeVisible();

    await page.getByRole("button", { name: "Registrar folio" }).click();
    const repetido = page.getByRole("dialog", { name: "Registrar folio" });
    await repetido.getByLabel("Folio").fill(WHATSAPP);
    await repetido
      .getByRole("button", { name: "Registrar", exact: true })
      .click();
    await expect(
      repetido.getByText(
        "Este folio ya se había registrado, por eso no se puede usar otra vez.",
      ),
    ).toBeVisible();
    await repetido.getByRole("button", { name: "No, regresar" }).click();
    await sinErrorGenerico(page);
  });

  await test.step("Adelantar un día y extender una sola vez", async () => {
    await adelantar(page, 1);
    const vencido = page.getByRole("article", {
      name: "Folio SIAPAZAP20261001",
    });
    await expect(vencido).toContainText("Venció");
    await vencido.getByRole("button", { name: "Sigue pendiente" }).click();
    await page.getByRole("button", { name: "Sí, sigue pendiente" }).click();
    await expect(
      page.getByText("Listo, le diste más tiempo al folio."),
    ).toBeVisible();
    await expect(
      vencido.getByRole("button", { name: "Sigue pendiente" }),
    ).toHaveCount(0);
    await expect(
      vencido.getByText("Ya le diste más tiempo una vez"),
    ).toBeVisible();
    await sinErrorGenerico(page);
  });

  await test.step("Me surtieron quema los otros folios activos", async () => {
    const folio = page.getByRole("article", { name: "Folio 116245001" });
    await folio.getByRole("button", { name: "Me surtieron" }).click();
    const dialogo = page.getByRole("dialog", {
      name: "¿Te surtieron con este folio?",
    });
    await expect(dialogo.getByRole("checkbox")).toBeChecked();
    await dialogo.getByRole("button", { name: "Sí, me surtieron" }).click();
    await expect(
      page.getByText("Listo, quitamos el folio de la lista."),
    ).toBeVisible();
    await expect(page.getByText("No tienes folios activos.")).toHaveCount(0);
    await expect(
      page.getByRole("article", { name: "Folio 2402" }),
    ).toContainText("Venció");
    await sinErrorGenerico(page);
  });

  await test.step("Pipas: juntando, lista, pedido y me da igual", async () => {
    await irA(page, "Pipas privadas");
    await expect(
      page.getByRole("article", { name: "Viaje Rubén 1" }),
    ).toContainText(/Juntando \(\d+ de 5\)/);
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toContainText("Listo para pedir");
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toContainText("Hace más de 24 horas");
    const donBeto = page.getByRole("article", { name: "Viaje Don Beto" });
    await expect(donBeto).toContainText("Puede que no alcance");
    await expect(donBeto).toContainText(/Pedido/);
    await page
      .getByRole("button", { name: "Ver casas del viaje de Don Beto" })
      .click();
    await expect(
      page.getByText("Se dio de baja después de pedido"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Volver a Pipas" }).click();
    await page
      .getByRole("button", { name: "Me da igual el proveedor" })
      .click();
    await expect(
      page.getByText(
        "Listo. Tu casa quedó anotada en el viaje de Pipas El Pozo.",
      ),
    ).toBeVisible();
    await sinErrorGenerico(page);
  });

  await test.step("Coordinación: lista, impresión, excepción y teléfono", async () => {
    const lista = await textoLista(page);
    exigirFormatoWhatsApp(lista);
    await page.evaluate(() => {
      window.print = () => {
        document.documentElement.dataset.imprimio = "1";
      };
    });
    await page.getByRole("button", { name: "Imprimir o guardar PDF" }).click();
    await expect(page.locator(".caseta table")).toBeVisible();
    await expect
      .poll(() => page.locator("html").getAttribute("data-imprimio"))
      .toBe("1");

    const naranjo = page.locator("article").filter({ hasText: "Naranjo 8" });
    await naranjo.getByRole("button", { name: "Aprobar" }).click();
    const aprobar = page.getByRole("dialog", { name: "¿Aprobar a Naranjo 8?" });
    await expect(aprobar.getByLabel("Número de casa")).toHaveValue("8");
    await aprobar.getByRole("button", { name: "Sí, aprobar" }).click();
    await expect(
      page.getByText("Listo. La solicitud quedó aprobada."),
    ).toBeVisible();

    const telefono = page
      .locator("li")
      .filter({ hasText: "Casa 7" })
      .filter({ has: page.getByRole("button", { name: "Reiniciar teléfono" }) })
      .first();
    await telefono.getByRole("button", { name: "Reiniciar teléfono" }).click();
    const reinicio = page.getByRole("dialog", {
      name: "¿Reiniciar el teléfono de la casa 7?",
    });
    await reinicio.getByRole("button", { name: "Sí, reiniciar" }).click();
    await expect(
      page.getByText(
        "Listo. La persona deberá volver a entrar y crear su PIN.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sancion|expulsar|mover/i }),
    ).toHaveCount(0);
    await sinErrorGenerico(page);
  });

  await test.step("Vecino de otra calle: rechazo y excepción", async () => {
    const barra = await abrirDemo(page);
    await barra.getByRole("button", { name: "Vecino de otra calle" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Esta lista es solo para la calle Eucalipto",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Por ahora esta lista es solo para la calle Eucalipto."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pedir una excepción" }).click();
    await page.getByLabel("Escribe tu teléfono").fill("5500000097");
    await page.getByLabel("Calle y número").fill("Ciruelo 8");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(
      page.getByText("puede pedirlo a la administración"),
    ).toBeVisible();
    await page.getByLabel("Calle y número").fill("Naranjo 40");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(
      page.getByRole("heading", { name: "Solicitud enviada" }),
    ).toBeVisible();
    await barra.getByRole("button", { name: "Vecino", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Solicitud enviada" }),
    ).toBeHidden();
    await sinErrorGenerico(page);
  });

  await test.step("Cierre y reinicio a la semilla", async () => {
    await irA(page, "Información");
    await expect(page.getByText("Piloto en Eucalipto.")).toBeVisible();
    await expect(
      page.getByText(
        "otras calles pueden usarlo con sus propios coordinadores.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Al terminar la crisis se borran teléfonos y PIN; solo quedan cifras anónimas por número de casa.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Los coordinadores no pueden dar ni quitar prioridad a nadie.",
      ),
    ).toBeVisible();

    const barra = await abrirDemo(page);
    await barra.getByRole("button", { name: "Reiniciar", exact: true }).click();
    await page
      .getByRole("dialog", { name: "¿Reiniciar el demo?" })
      .getByRole("button", { name: "Sí, reiniciar" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Folios SIAPA" }),
    ).toBeVisible();
    await expect(demo(page)).toContainText("Día +0");
    expect(await reloj(page)).toBe(inicio);
    await expect(
      page.getByRole("article", { name: "Folio SIAPAZAP20261001" }),
    ).toContainText("Vence hoy");
    await expect(page.getByText(TEL)).toHaveCount(0);
    await expect(page.getByText(WHATSAPP)).toHaveCount(0);
    await irA(page, "Pipas privadas");
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toBeVisible();
    await verCoordinador(page);
    await expect(page.getByText("Naranjo 8")).toBeVisible();
    await sinErrorGenerico(page);
  });
});
