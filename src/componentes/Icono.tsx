/** Íconos de trazo de 2 px. Los símbolos viven en `Iconos` (se monta una vez). */
export type NombreIcono =
  | "gota"
  | "alerta"
  | "reloj-arena"
  | "check"
  | "cambio"
  | "personas"
  | "check-circulo"
  | "pipa"
  | "bandera"
  | "x-circulo"
  | "info"
  | "folio"
  | "tablero"
  | "mas"
  | "chat"
  | "telefono"
  | "derecha"
  | "abajo"
  | "estrella"
  | "impresora"
  | "copiar"
  | "casa"
  | "reloj"
  | "salida"
  | "aljibe-vacio"
  | "aljibe-bajo"
  | "aljibe-medio"
  | "aljibe-lleno";

const RUTAS: Record<NombreIcono, string> = {
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  alerta:
    '<path d="M12 3.5l9 16.5H3z"/><path d="M12 10v4.5"/><path d="M12 17.6v.1"/>',
  "reloj-arena":
    '<path d="M6 3h12M6 21h12"/><path d="M8 3v3c0 2.5 4 4 4 6s-4 3.5-4 6v3M16 3v3c0 2.5-4 4-4 6s4 3.5 4 6v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  cambio: '<path d="M4 8h14l-3.5-3.5"/><path d="M20 16H6l3.5 3.5"/>',
  personas:
    '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.6.3 4.5 2.6 4.5 5.5"/>',
  "check-circulo": '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  pipa: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.5l3.5 3.5V16h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  bandera: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  "x-circulo": '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.1"/>',
  folio:
    '<path d="M4 5h16v4.5a2.5 2.5 0 0 0 0 5V19H4v-4.5a2.5 2.5 0 0 0 0-5z"/><path d="M10 9.5h4M10 14.5h4"/>',
  tablero:
    '<path d="M9 3.5h6v3H9z"/><path d="M9 5H5v16h14V5h-4"/><path d="M8.5 11h7M8.5 15h7"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  chat: '<path d="M4 5h16v11H10l-6 4z"/>',
  telefono:
    '<path d="M6.5 3H10l1.5 4.5-2.3 1.4a11 11 0 0 0 5 5l1.4-2.3L20 13v3.5a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5a2 2 0 0 1 2-2z"/>',
  derecha: '<path d="M9 6l6 6-6 6"/>',
  abajo: '<path d="M6 9l6 6 6-6"/>',
  estrella:
    '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  impresora:
    '<path d="M7 9V3h10v6"/><path d="M5 9h14a2 2 0 0 1 2 2v6h-4M7 17H3v-6a2 2 0 0 1 2-2"/><path d="M7 14h10v7H7z"/>',
  copiar: '<path d="M9 9h11v11H9z"/><path d="M5 15H4V4h11v1"/>',
  casa: '<path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  salida: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M18 12H9"/>',
  "aljibe-vacio": '<path d="M7 5h10v14H7z"/>',
  "aljibe-bajo": '<path d="M7 5h10v14H7z"/><path d="M7 15h10"/>',
  "aljibe-medio": '<path d="M7 5h10v14H7z"/><path d="M7 12h10"/>',
  "aljibe-lleno": '<path d="M7 5h10v14H7z"/><path d="M7 8h10"/>',
};

/** Ícono decorativo: siempre `aria-hidden`; el texto vecino lo nombra. */
export function Icono({
  nombre,
  chico = false,
}: {
  nombre: NombreIcono;
  chico?: boolean;
}) {
  return (
    <svg
      class={chico ? "icono icono--chico" : "icono"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: RUTAS[nombre] }}
    />
  );
}
