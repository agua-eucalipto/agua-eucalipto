import type { EsperaVista, ViajeVista } from "../../api";
import type { EstadoVisual } from "../../componentes";
import { DIA_MS } from "../../app/servicios";
import { textos } from "../../textos";

const { pipas } = textos;

export const HORA_MS = 60 * 60 * 1000;

/** Viajes que todavía reciben o esperan a la pipa. */
export function esActivo(v: ViajeVista): boolean {
  return (
    v.estado === "juntando" || v.estado === "lista" || v.estado === "pedida"
  );
}

export function visualDeEstado(estado: ViajeVista["estado"]): EstadoVisual {
  switch (estado) {
    case "juntando":
      return "juntando";
    case "lista":
      return "lista";
    case "pedida":
      return "pedida";
    case "ya_paso":
      return "paso";
    case "cerrado":
      return "cerrado";
  }
}

export function textoDeEstado(v: ViajeVista): string {
  switch (v.estado) {
    case "juntando":
      return pipas.viaje.juntando(v.anotadas, v.minimo_casas);
    case "lista":
      return pipas.viaje.lista;
    case "pedida":
      return v.eta_texto
        ? pipas.viaje.pedida(v.eta_texto)
        : pipas.viaje.pedidaSinHora;
    case "ya_paso":
      return pipas.viaje.yaPaso;
    case "cerrado":
      return pipas.viaje.cerrado;
  }
}

/** "hace 2 días", "hace 8 h"… a partir de un instante y el reloj simulado. */
export function antiguedadTexto(desde: number, ahora: number): string {
  const ms = Math.max(0, ahora - desde);
  if (ms >= DIA_MS) return pipas.espera.haceDias(Math.floor(ms / DIA_MS));
  if (ms >= HORA_MS) return pipas.espera.haceHoras(Math.floor(ms / HORA_MS));
  return pipas.espera.haceMenosDeUnaHora;
}

export function textoOrigenEspera(e: EsperaVista): string {
  switch (e.origen) {
    case "me_da_igual":
      return pipas.espera.cualquierProveedor;
    case "pendiente":
      return pipas.espera.pendiente;
    case "viaje_cerrado":
      return pipas.espera.viajeCerrado;
  }
}

/** Lugar de la casa entre las anotadas del viaje, empezando en 1. */
export function lugarDe(v: ViajeVista, casa: string | null): number {
  const anotadas = v.anotaciones.filter((a) => a.estado === "anotada");
  return anotadas.findIndex((a) => a.casa_numero === casa) + 1;
}

/**
 * En pantallas angostas `.dos-columnas` todavía no es una rejilla y las dos
 * partes quedan pegadas. Esto les da separación; desde 960 px coincide con
 * lo que ya define la hoja de estilos.
 */
export const DOS_COLUMNAS = {
  display: "grid",
  gap: "var(--e-5)",
} as const;
