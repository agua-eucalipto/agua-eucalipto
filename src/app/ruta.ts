import { signal } from "@preact/signals";

export const RUTAS = ["siapa", "pipas", "coordinador", "info"] as const;
export type Ruta = (typeof RUTAS)[number];
export const RUTA_INICIAL: Ruta = "siapa";

/** Lee la ruta de un hash tipo `#pipas`; `null` si no es una ruta conocida. */
export function rutaDeHash(hash: string): Ruta | null {
  const limpio = hash.replace(/^#\/?/, "");
  if (limpio === "") return RUTA_INICIAL;
  return (RUTAS as readonly string[]).includes(limpio)
    ? (limpio as Ruta)
    : null;
}

export function hashDeRuta(ruta: Ruta): string {
  return `#${ruta}`;
}

/** Ruta actual (o `null` si el hash no existe). Se actualiza con `hashchange`. */
export const rutaActual = signal<Ruta | null>(rutaDeHash(window.location.hash));

export function iniciarNavegacion(): () => void {
  const alCambiar = () => {
    rutaActual.value = rutaDeHash(window.location.hash);
  };
  window.addEventListener("hashchange", alCambiar);
  alCambiar();
  return () => window.removeEventListener("hashchange", alCambiar);
}
