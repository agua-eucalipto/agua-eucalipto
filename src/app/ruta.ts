import { signal } from "@preact/signals";

export const RUTAS = ["siapa", "pipas", "coordinador", "info"] as const;
/** `sistema` es el catálogo de componentes: solo existe con `npm run dev`. */
export type Ruta = (typeof RUTAS)[number] | "sistema";
export const RUTA_INICIAL: Ruta = "siapa";

/**
 * Lee la ruta de un hash tipo `#pipas` o `#pipas/12/editar`; `null` si no es
 * una ruta conocida. Lo que va después de la primera `/` es la subruta.
 */
export function rutaDeHash(hash: string): Ruta | null {
  const [base = ""] = hash.replace(/^#\/?/, "").split("/");
  if (base === "") return RUTA_INICIAL;
  if (base === "sistema" && import.meta.env.DEV) return "sistema";
  return (RUTAS as readonly string[]).includes(base) ? (base as Ruta) : null;
}

/** Subruta de un hash: `#pipas/12/editar` → `"12/editar"`; `""` si no hay. */
export function subrutaDeHash(hash: string): string {
  const partes = hash.replace(/^#\/?/, "").split("/");
  return partes.slice(1).filter(Boolean).join("/");
}

export function hashDeRuta(ruta: Ruta): string {
  return `#${ruta}`;
}

/** Ruta actual (o `null` si el hash no existe). Se actualiza con `hashchange`. */
export const rutaActual = signal<Ruta | null>(rutaDeHash(window.location.hash));
/** Subruta dentro de la pantalla actual (p. ej. el viaje abierto en Pipas). */
export const subruta = signal<string>(subrutaDeHash(window.location.hash));

export function iniciarNavegacion(): () => void {
  const alCambiar = () => {
    rutaActual.value = rutaDeHash(window.location.hash);
    subruta.value = subrutaDeHash(window.location.hash);
  };
  window.addEventListener("hashchange", alCambiar);
  alCambiar();
  return () => window.removeEventListener("hashchange", alCambiar);
}

/** Vuelve a la pantalla inicial sin dejar una entrada más en el historial. */
export function irAInicio(): void {
  window.history.replaceState(
    window.history.state,
    "",
    hashDeRuta(RUTA_INICIAL),
  );
  window.dispatchEvent(new Event("hashchange"));
}
