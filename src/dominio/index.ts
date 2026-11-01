import { CANALES } from "./tipos";
import { TOPE_FOLIOS_POR_CANAL } from "./reglas";

/** Tope de activos de una casa: 2 por cada canal. */
export const TOPE_FOLIOS_POR_CASA = TOPE_FOLIOS_POR_CANAL * CANALES.length;

export * from "./aljibe";
export * from "./casas";
export * from "./exif";
export * from "./folios";
export * from "./huella";
export * from "./reglas";
export * from "./telefonos";
export * from "./tipos";
export * from "./viajes";
