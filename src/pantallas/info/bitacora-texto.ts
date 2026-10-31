import type { EventoVista } from "../../api";
import { info } from "../../textos";

const b = info.bitacora;

/** Folio completo: prefijo conocido seguido de dígitos. */
const FOLIO_COMPLETO = /\b(SIAPAZAP|1162)(\d{3,})\b/gi;
/** Teléfono de 10 dígitos, con o sin separadores (y lada +52 opcional). */
const TELEFONO = /(?:\+?52\s?)?\(?\d{2}\)?[\s.-]?\d{4}[\s.-]?\d{4}|\b\d{10}\b/g;

/**
 * Última defensa de la bitácora: aunque la `Api` ya entrega folios
 * enmascarados y no lleva teléfonos, nada que parezca un folio completo o un
 * teléfono llega a la pantalla.
 */
export function proteger(texto: string): string {
  return texto
    .replace(FOLIO_COMPLETO, (_t, prefijo: string, resto: string) => {
      return `${prefijo.toUpperCase()}••••${resto.slice(-4)}`;
    })
    .replace(TELEFONO, "••••");
}

function cadena(valor: unknown): string {
  return typeof valor === "string" ? proteger(valor) : "";
}

function canal(valor: unknown): string {
  return valor === "whatsapp" || valor === "telefono" ? b.canal[valor] : "";
}

/** Quién hizo el movimiento: «Casa 7», «Coordinación (casa 3)» o «El sistema». */
export function quien(e: EventoVista): string {
  if (e.rol === "sistema" || e.casa_numero === null) return b.sistema;
  const casa = proteger(e.casa_numero);
  return e.rol === "coordinador" ? b.coordinacion(casa) : b.casa(casa);
}

/** Qué hizo, en lenguaje llano y sin datos que no sean públicos. */
export function queHizo(e: EventoVista): string {
  const d = e.detalle;
  switch (e.tipo) {
    case "folio_registrado":
      return b.eventos.folio_registrado(cadena(d.folio), canal(d.canal));
    case "folio_reemplazado":
      return b.eventos.folio_reemplazado(
        cadena(d.folio),
        cadena(d.reemplazado_por),
      );
    case "folio_extendido":
      return b.eventos.folio_extendido(cadena(d.folio));
    case "folio_surtido":
      return b.eventos.folio_surtido(cadena(d.folio));
    case "entrega_confirmada":
      return b.eventos.entrega_confirmada(cadena(d.resultado));
    default: {
      const texto = b.eventos[e.tipo] as (() => string) | undefined;
      return texto ? texto() : b.otro;
    }
  }
}

/** «hace 2 h», «hace 3 días»… respecto al reloj del demo. */
export function hace(desde: number, ahora: number): string {
  const min = Math.floor(Math.max(0, ahora - desde) / 60000);
  if (min < 1) return b.ahora;
  if (min < 60) return b.minutos(min);
  const horas = Math.floor(min / 60);
  if (horas < 48) return b.horas(horas);
  return b.dias(Math.floor(horas / 24));
}
