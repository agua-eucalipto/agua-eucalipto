import { describe, expect, it } from "vitest";
import type { ListaCaseta } from "../../../src/api";
import {
  fechaLista,
  telefonoLegible,
  textoWhatsApp,
} from "../../../src/pantallas/coordinador/formato";

// lun 2 nov 2026, 9:00 en hora local (no depende de la zona horaria).
const LUNES_9 = new Date(2026, 10, 2, 9, 0).getTime();

const LISTA: ListaCaseta = {
  envio_id: "e1",
  generada_at: LUNES_9,
  opciones: { canal: true, dias: true, formato: "whatsapp" },
  filas: [
    {
      casa_numero: "3",
      folios: [
        { codigo: "SIAPAZAP12345678", canal: "whatsapp", dias_que_lleva: 0 },
        { codigo: "116298765", canal: "telefono", dias_que_lleva: 1 },
      ],
    },
    {
      casa_numero: "12",
      folios: [{ codigo: "116211122", canal: "telefono", dias_que_lleva: 2 }],
    },
  ],
  total_casas: 2,
  total_folios: 3,
};

describe("texto para WhatsApp (formato de la lista para caseta)", () => {
  it("con canal y días es idéntico al formato aprobado", () => {
    expect(textoWhatsApp(LISTA, { canal: true, dias: true })).toBe(
      [
        "*Agua Eucalipto · Folios vigentes*",
        "lun 2 nov 2026, 9:00",
        "",
        "Casa 3: SIAPAZAP12345678 (WhatsApp, menos de un día), 116298765 (tel, 1 día)",
        "Casa 12: 116211122 (tel, 2 días)",
        "Total: 2 casas, 3 folios",
      ].join("\n"),
    );
  });

  it("sin opcionales solo lleva los códigos", () => {
    expect(textoWhatsApp(LISTA, { canal: false, dias: false })).toBe(
      [
        "*Agua Eucalipto · Folios vigentes*",
        "lun 2 nov 2026, 9:00",
        "",
        "Casa 3: SIAPAZAP12345678, 116298765",
        "Casa 12: 116211122",
        "Total: 2 casas, 3 folios",
      ].join("\n"),
    );
  });

  it("con solo uno de los opcionales", () => {
    const solo = (canal: boolean, dias: boolean) =>
      textoWhatsApp(LISTA, { canal, dias }).split("\n")[4];
    expect(solo(true, false)).toBe("Casa 12: 116211122 (tel)");
    expect(solo(false, true)).toBe("Casa 12: 116211122 (2 días)");
  });

  it("usa el singular cuando hay una sola casa o un solo folio", () => {
    const una: ListaCaseta = {
      ...LISTA,
      filas: [LISTA.filas[1]!],
      total_casas: 1,
      total_folios: 1,
    };
    expect(
      textoWhatsApp(una, { canal: false, dias: false }).split("\n"),
    ).toEqual([
      "*Agua Eucalipto · Folios vigentes*",
      "lun 2 nov 2026, 9:00",
      "",
      "Casa 12: 116211122",
      "Total: 1 casa, 1 folio",
    ]);
  });
});

describe("formatos", () => {
  it("fecha con y sin año", () => {
    expect(fechaLista(LUNES_9)).toBe("lun 2 nov, 9:00");
    expect(fechaLista(LUNES_9, true)).toBe("lun 2 nov 2026, 9:00");
    expect(fechaLista(new Date(2026, 9, 30, 14, 5).getTime())).toBe(
      "vie 30 oct, 14:05",
    );
  });

  it("teléfono legible", () => {
    expect(telefonoLegible("5500000003")).toBe("55 0000 0003");
    expect(telefonoLegible("123")).toBe("123");
  });
});
