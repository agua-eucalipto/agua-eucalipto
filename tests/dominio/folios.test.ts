import { describe, expect, it } from "vitest";
import {
  DIA_MS,
  HORA_MS,
  clasificarFolio,
  diasQueLleva,
  estadoFolio,
  normalizarFolio,
  puedeExtender,
  venceAt,
  venceHoy,
} from "../../src/dominio";
import type { FolioTiempos } from "../../src/dominio";

const REGISTRO = Date.UTC(2026, 10, 2, 9, 0, 0);
const MINUTO_MS = 60 * 1000;

function folio(cambios: Partial<FolioTiempos> = {}): FolioTiempos {
  return {
    registrado_at: REGISTRO,
    extendido_at: null,
    cierre: null,
    ...cambios,
  };
}

describe("F-01 normalizarFolio", () => {
  it("pasa a mayúsculas y quita espacios, guiones y puntos", () => {
    expect(normalizarFolio(" siapa zap-1234.5678 ")).toBe("SIAPAZAP12345678");
    expect(normalizarFolio("1162–98 76—54")).toBe("1162987654");
  });

  it("deja igual un código ya normalizado", () => {
    expect(normalizarFolio("SIAPAZAP12345678")).toBe("SIAPAZAP12345678");
  });
});

describe("F-02 clasificarFolio", () => {
  it("detecta el canal WhatsApp por prefijo y devuelve el código normalizado", () => {
    expect(clasificarFolio("siapazap 0001")).toEqual({
      codigo: "SIAPAZAP0001",
      canal: "whatsapp",
    });
  });

  it("detecta el canal teléfono por prefijo", () => {
    expect(clasificarFolio("1162-98765")).toEqual({
      codigo: "116298765",
      canal: "telefono",
    });
  });

  it("detecta el Ayuntamiento cuando hay exactamente 4 dígitos", () => {
    expect(clasificarFolio("12 34")).toEqual({
      codigo: "1234",
      canal: "ayuntamiento",
    });
    expect(clasificarFolio("1162")).toEqual({
      codigo: "1162",
      canal: "ayuntamiento",
    });
  });

  it.each([
    ["", "vacío"],
    ["ABC12345", "prefijo desconocido"],
    ["SIAPAZAP123", "menos de 4 dígitos"],
    ["1162123", "menos de 4 dígitos en teléfono"],
    ["12345", "cinco dígitos"],
    ["SIAPAZAP12A45", "letras entre los dígitos"],
    ["XSIAPAZAP12345", "texto antes del prefijo"],
  ])("rechaza %j (%s)", (codigo) => {
    expect(clasificarFolio(codigo)).toBeNull();
  });
});

describe("F-06 y F-07 venceAt", () => {
  it("vence a las 72 h del registro", () => {
    expect(venceAt(folio())).toBe(REGISTRO + 3 * DIA_MS);
  });

  it("si se extendió, vence a los 6 días del registro", () => {
    expect(venceAt(folio({ extendido_at: REGISTRO + 2 * DIA_MS }))).toBe(
      REGISTRO + 6 * DIA_MS,
    );
  });
});

describe("estadoFolio", () => {
  it("borde de 72 h: 71:59 sigue activo y 72:00 ya venció", () => {
    expect(estadoFolio(folio(), REGISTRO + 72 * HORA_MS - MINUTO_MS)).toBe(
      "activo",
    );
    expect(estadoFolio(folio(), REGISTRO + 72 * HORA_MS)).toBe("vencido");
  });

  it("borde de 144 h con extensión: 143:59 activo y 144:00 vencido", () => {
    const extendido = folio({ extendido_at: REGISTRO + 80 * HORA_MS });
    expect(estadoFolio(extendido, REGISTRO + 144 * HORA_MS - MINUTO_MS)).toBe(
      "activo",
    );
    expect(estadoFolio(extendido, REGISTRO + 144 * HORA_MS)).toBe("vencido");
  });

  it("un cierre manda sobre el tiempo, venza o no", () => {
    expect(estadoFolio(folio({ cierre: "surtido" }), REGISTRO + HORA_MS)).toBe(
      "surtido",
    );
    expect(
      estadoFolio(folio({ cierre: "reemplazado" }), REGISTRO + 500 * HORA_MS),
    ).toBe("reemplazado");
    expect(
      estadoFolio(folio({ cierre: "cerrado_sin_surtir" }), REGISTRO + HORA_MS),
    ).toBe("cerrado_sin_surtir");
  });
});

describe("diasQueLleva", () => {
  it("cuenta bloques completos de 24 h", () => {
    expect(diasQueLleva(REGISTRO, REGISTRO)).toBe(0);
    expect(diasQueLleva(REGISTRO, REGISTRO + DIA_MS - MINUTO_MS)).toBe(0);
    expect(diasQueLleva(REGISTRO, REGISTRO + DIA_MS)).toBe(1);
    expect(diasQueLleva(REGISTRO, REGISTRO + 2 * DIA_MS)).toBe(2);
  });

  it("nunca devuelve negativos si el reloj retrocede", () => {
    expect(diasQueLleva(REGISTRO, REGISTRO - 5 * DIA_MS)).toBe(0);
  });
});

describe("F-07 e I-01 puedeExtender", () => {
  it("borde de 6 días: 143:59 sí y 144:00 ya no", () => {
    expect(puedeExtender(folio(), REGISTRO + 144 * HORA_MS - MINUTO_MS)).toBe(
      true,
    );
    expect(puedeExtender(folio(), REGISTRO + 144 * HORA_MS)).toBe(false);
  });

  it("permite extender un folio que ya venció si no pasan 6 días", () => {
    const vencido = REGISTRO + 100 * HORA_MS;
    expect(estadoFolio(folio(), vencido)).toBe("vencido");
    expect(puedeExtender(folio(), vencido)).toBe(true);
  });

  it("solo una vez por folio", () => {
    expect(
      puedeExtender(
        folio({ extendido_at: REGISTRO + DIA_MS }),
        REGISTRO + 2 * DIA_MS,
      ),
    ).toBe(false);
  });

  it("no se puede extender un folio cerrado", () => {
    expect(puedeExtender(folio({ cierre: "surtido" }), REGISTRO + DIA_MS)).toBe(
      false,
    );
    expect(
      puedeExtender(folio({ cierre: "reemplazado" }), REGISTRO + DIA_MS),
    ).toBe(false);
    expect(
      puedeExtender(folio({ cierre: "cerrado_sin_surtir" }), REGISTRO + DIA_MS),
    ).toBe(false);
  });
});

describe("F-10 venceHoy", () => {
  it("avisa cuando faltan menos de 24 h", () => {
    expect(venceHoy(folio(), REGISTRO + 48 * HORA_MS)).toBe(false);
    expect(venceHoy(folio(), REGISTRO + 48 * HORA_MS + 1)).toBe(true);
    expect(venceHoy(folio(), REGISTRO + 72 * HORA_MS - MINUTO_MS)).toBe(true);
  });

  it("no avisa si ya venció ni si está cerrado", () => {
    expect(venceHoy(folio(), REGISTRO + 72 * HORA_MS)).toBe(false);
    expect(
      venceHoy(folio({ cierre: "surtido" }), REGISTRO + 60 * HORA_MS),
    ).toBe(false);
  });
});
