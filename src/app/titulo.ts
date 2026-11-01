import { signal } from "@preact/signals";

/**
 * Subtítulo que la pantalla activa muestra bajo el título (p. ej. «Casa 7 · 2
 * activos de 4»). La pantalla lo escribe y lo limpia al desmontarse; el shell
 * lo dibuja en `TituloPantalla`.
 */
export const resumenTitulo = signal("");
