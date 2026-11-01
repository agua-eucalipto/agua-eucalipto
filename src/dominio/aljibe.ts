import { DIA_MS } from "./reglas";

export const NIVELES_ALJIBE = ["vacio", "bajo", "medio", "lleno"] as const;

export type NivelAljibe = (typeof NIVELES_ALJIBE)[number];

export const MARCAS_EVIDENCIA = [
  "foto_repetida",
  "foto_antigua",
  "sin_fecha",
] as const;

export type MarcaEvidencia = (typeof MARCAS_EVIDENCIA)[number];

export function esNivelAljibe(valor: unknown): valor is NivelAljibe {
  return (
    typeof valor === "string" &&
    (NIVELES_ALJIBE as readonly string[]).includes(valor)
  );
}

/**
 * Marcas de una foto. No bloquean: solo describen lo que se pudo leer.
 * «Foto antigua» es estrictamente más de 24 horas antes del reloj.
 */
export function marcasDeEvidencia(datos: {
  hayFoto: boolean;
  huella: string | null;
  huellasPrevias: readonly string[];
  fechaExif: number | null;
  ahora: number;
}): MarcaEvidencia[] {
  if (!datos.hayFoto) return [];
  const marcas: MarcaEvidencia[] = [];
  if (datos.huella !== null && datos.huellasPrevias.includes(datos.huella)) {
    marcas.push("foto_repetida");
  }
  if (datos.fechaExif === null) {
    marcas.push("sin_fecha");
  } else if (datos.ahora - datos.fechaExif > DIA_MS) {
    marcas.push("foto_antigua");
  }
  return marcas;
}
