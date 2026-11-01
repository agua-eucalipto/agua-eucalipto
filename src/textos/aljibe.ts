/** Textos del nivel del aljibe. Cada frase cabe en 20 palabras. */
import type { MarcaEvidencia, NivelAljibe } from "../api";

export const aljibe = {
  titulo: "Nivel de mi aljibe",
  ayuda: "Elige el nivel. La foto es opcional.",
  grupo: "Nivel del aljibe",
  niveles: {
    vacio: "Vacío",
    bajo: "Bajo",
    medio: "Medio",
    lleno: "Lleno",
  } satisfies Record<NivelAljibe, string>,
  foto: "Foto del aljibe, opcional",
  fotoLista: "Foto lista para guardar.",
  notaFoto: "La foto no sale de este navegador.",
  guardar: "Guardar reporte",
  guardando: "Guardando…",
  elige: "Elige un nivel para guardar.",
  listo: "Listo. Guardamos el nivel de tu aljibe.",
  ultimo: (fecha: string) => `Último reporte: ${fecha}.`,
  sinReporte: "Todavía no reportas el nivel.",
  marcas: {
    foto_repetida: "Foto repetida",
    foto_antigua: "Foto antigua",
    sin_fecha: "Sin fecha en la foto",
  } satisfies Record<MarcaEvidencia, string>,
  camara: (nombre: string) => `Cámara: ${nombre}.`,
  fallo: "No pudimos guardar el reporte. ¿Lo intentas otra vez?",
  listaTitulo: "Aljibes",
  listaVacia: "Nadie ha reportado su aljibe.",
  casa: (n: string) => `Casa ${n}`,
} as const;
