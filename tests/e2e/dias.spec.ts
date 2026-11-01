import { expect, test, type Page } from "@playwright/test";
import {
  abrirDemo,
  adelantar,
  demo,
  exigirFormatoWhatsApp,
  irA,
  pasarIntro,
  reloj,
  sinErrorGenerico,
  textoLista,
  verVecino,
} from "./apoyo";

function filaEspera(page: Page, casa: string) {
  return page
    .getByRole("region", { name: "En espera" })
    .locator("li")
    .filter({ has: page.getByText(`Casa ${casa}`, { exact: true }) });
}

test("adelantar tres días sigue la tabla y reiniciar vuelve a la semilla", async ({
  page,
}) => {
  await pasarIntro(page);
  const inicio = await reloj(page);

  await test.step("Día 0, semilla", async () => {
    await expect(
      page.getByRole("article", { name: "Folio SIAPAZAP20261001" }),
    ).toContainText("Vence hoy");
    await expect(
      page.getByRole("article", { name: "Folio 2402" }),
    ).toContainText("Ayuntamiento de Zapopan");
    await expect(
      page.getByRole("article", { name: "Folio 116245001" }),
    ).toContainText("Teléfono del SIAPA");
    await verVecino(page, "3", "116245010");
    await expect(
      page.getByRole("article", { name: "Folio 116245010" }),
    ).toContainText("Vence hoy");
    await verVecino(page, "4", "SIAPAZAP20260980");
    const casa4 = page.getByRole("article", { name: "Folio SIAPAZAP20260980" });
    await expect(casa4).toContainText("Venció");
    await expect(
      casa4.getByRole("button", { name: "Sigue pendiente" }),
    ).toBeVisible();

    const lista = await textoLista(page);
    exigirFormatoWhatsApp(lista);
    expect(lista).toContain("SIAPAZAP20261001");
    expect(lista).toContain("116245010");
    expect(lista).not.toContain("SIAPAZAP20260980");
    expect(lista).not.toContain("116244900");
    expect(lista).not.toContain("2402");
    expect(lista).not.toContain("2401");
    expect(lista).toContain("Total: 5 casas, 9 folios");

    await irA(page, "Pipas privadas");
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Viaje Don Beto" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Viaje Rubén 1" }),
    ).toBeVisible();
  });

  await test.step("Día +1: vencen los de hoy y salen de la lista", async () => {
    await adelantar(page, 1);
    await verVecino(page, "7", "SIAPAZAP20261001");
    const siete = page.getByRole("article", { name: "Folio SIAPAZAP20261001" });
    await expect(siete).toContainText("Venció");
    await expect(
      siete.getByRole("button", { name: "Sigue pendiente" }),
    ).toBeVisible();
    await verVecino(page, "3", "116245010");
    await expect(
      page.getByRole("article", { name: "Folio 116245010" }),
    ).toContainText("Venció");

    const lista = await textoLista(page);
    exigirFormatoWhatsApp(lista);
    expect(lista).not.toContain("SIAPAZAP20261001");
    expect(lista).not.toContain("116245010");
    expect(lista).toContain("SIAPAZAP20260950");
    expect(lista).toContain("Total: 5 casas, 7 folios");

    await irA(page, "Pipas privadas");
    await page
      .getByRole("button", { name: "Ver casas del viaje de Rubén 2" })
      .click();
    const casa9 = page
      .locator("li")
      .filter({ has: page.getByText("Casa 9", { exact: true }) });
    await expect(casa9).toContainText("Falta confirmar");
    await expect(casa9).not.toContainText("Sin confirmar");
    await page.getByRole("button", { name: "Volver a Pipas" }).click();
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Viaje Don Beto" }),
    ).toBeVisible();
  });

  await test.step("Día +2: cierran viajes, casa 9 sin confirmar y vence el extendido", async () => {
    await adelantar(page, 2);
    await verVecino(page, "7", "SIAPAZAP20260950");
    const extendido = page.getByRole("article", {
      name: "Folio SIAPAZAP20260950",
    });
    await expect(extendido).toContainText("Venció");
    await expect(
      extendido.getByRole("button", { name: "Sigue pendiente" }),
    ).toHaveCount(0);

    const lista = await textoLista(page);
    exigirFormatoWhatsApp(lista);
    expect(lista).not.toContain("SIAPAZAP20260950");
    expect(lista).not.toContain("SIAPAZAP20261001");
    expect(lista).not.toContain("116245010");
    expect(lista).not.toContain("116245001");
    expect(lista).toContain("SIAPAZAP20261010");
    expect(lista).toContain("116245020");
    expect(lista).toContain("Total: 2 casas, 2 folios");

    await irA(page, "Pipas privadas");
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("article", { name: "Viaje Don Beto" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("article", { name: "Viaje Rubén 1" }),
    ).toBeVisible();
    for (const casa of ["13", "5", "6", "8", "10", "11", "19"]) {
      await expect(filaEspera(page, casa)).toBeVisible();
    }
    const trece = filaEspera(page, "13");
    await expect(trece).toContainText("Con prioridad");
    await expect(trece).toContainText("Su viaje se cerró");
    await expect(trece).not.toContainText("hace menos de una hora");

    await page
      .getByRole("button", { name: "Ver casas del viaje de Rubén 2" })
      .click();
    const casa9 = page
      .locator("li")
      .filter({ has: page.getByText("Casa 9", { exact: true }) });
    await expect(casa9).toContainText("Sin confirmar");
    await page.getByRole("button", { name: "Volver a Pipas" }).click();

    await verVecino(page, "4", "SIAPAZAP20260980");
    await expect(
      page
        .getByRole("article", { name: "Folio SIAPAZAP20260980" })
        .getByRole("button", { name: "Sigue pendiente" }),
    ).toBeVisible();
  });

  await test.step("Día +3: cierra Rubén 1 y la casa 4 ya no extiende", async () => {
    await adelantar(page, 3);
    await irA(page, "Pipas privadas");
    await expect(
      page.getByRole("article", { name: "Viaje Rubén 1" }),
    ).toHaveCount(0);
    for (const casa of ["12", "14", "16"]) {
      await expect(filaEspera(page, casa)).toBeVisible();
    }
    await verVecino(page, "4", "SIAPAZAP20260980");
    const casa4 = page.getByRole("article", { name: "Folio SIAPAZAP20260980" });
    await expect(casa4).toContainText("Venció");
    await expect(
      casa4.getByRole("button", { name: "Sigue pendiente" }),
    ).toHaveCount(0);

    const lista = await textoLista(page);
    expect(lista).toContain("*Agua Eucalipto · Folios vigentes*");
    expect(lista).toContain("Total: 0 casas, 0 folios");
    expect(lista).not.toContain("SIAPAZAP");
    expect(lista).not.toContain("1162");
    await expect(
      page.getByText("Ahora no hay folios vigentes para la caseta."),
    ).toBeVisible();
    await sinErrorGenerico(page);
  });

  await test.step("Reiniciar regresa a la semilla con el reloj de hoy", async () => {
    const barra = await abrirDemo(page);
    await barra.getByRole("button", { name: "Reiniciar", exact: true }).click();
    await page
      .getByRole("dialog", { name: "¿Reiniciar el demo?" })
      .getByRole("button", { name: "Sí, reiniciar" })
      .click();
    await expect(demo(page)).toContainText("Día +0");
    expect(await reloj(page)).toBe(inicio);
    await expect(
      page.getByRole("heading", { level: 1, name: "Folios SIAPA" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Folio SIAPAZAP20261001" }),
    ).toContainText("Vence hoy");
    await irA(page, "Pipas privadas");
    await expect(
      page.getByRole("article", { name: "Viaje Pipas El Pozo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Viaje Don Beto" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Viaje Rubén 1" }),
    ).toBeVisible();
    await sinErrorGenerico(page);
  });
});
