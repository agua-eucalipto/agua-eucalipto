import type { ComponentChildren, JSX } from "preact";
import { Icono, type NombreIcono } from "./Icono";

export type VarianteBoton = "primario" | "secundario" | "texto";

interface PropsBoton {
  variante?: VarianteBoton;
  icono?: NombreIcono;
  ancho?: boolean;
  /** Deshabilitado con razón visible debajo; sigue enfocable (`aria-disabled`). */
  deshabilitado?: boolean;
  /** Explica por qué no se puede, p. ej. "Faltan 2 casas para el mínimo". */
  razon?: string;
  onClick?: (e: MouseEvent) => void;
  type?: "button" | "submit";
  id?: string;
  /** Recibe el foco al abrir un diálogo (la acción principal). */
  focoInicial?: boolean;
  "aria-label"?: string;
  children: ComponentChildren;
}

function clases(variante: VarianteBoton, ancho: boolean) {
  return `btn btn--${variante}${ancho ? " btn--ancho" : ""}`;
}

export function Boton({
  variante = "secundario",
  icono,
  ancho = false,
  deshabilitado = false,
  razon,
  onClick,
  type = "button",
  focoInicial = false,
  children,
  ...resto
}: PropsBoton) {
  const idRazon = razon && resto.id ? `${resto.id}-razon` : undefined;
  const boton = (
    <button
      {...resto}
      type={type}
      data-foco-inicial={focoInicial ? "" : undefined}
      class={clases(variante, ancho)}
      aria-disabled={deshabilitado ? "true" : undefined}
      aria-describedby={deshabilitado ? idRazon : undefined}
      onClick={(e) => {
        if (deshabilitado) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {icono ? <Icono nombre={icono} /> : null}
      {children}
    </button>
  );
  if (!razon) return boton;
  return (
    <>
      {boton}
      <p class="razon" id={idRazon}>
        {razon}
      </p>
    </>
  );
}

/** Enlace con apariencia de botón (navegación por hash). */
export function EnlaceBoton({
  variante = "secundario",
  href,
  ancho = false,
  children,
}: {
  variante?: VarianteBoton;
  href: string;
  ancho?: boolean;
  children: ComponentChildren;
}) {
  return (
    <a class={clases(variante, ancho)} href={href}>
      {children}
    </a>
  );
}

/** Botón redondo de solo ícono: lleva `etiqueta` como nombre accesible. */
export function BotonIcono({
  icono,
  etiqueta,
  onClick,
  deshabilitado = false,
  ...resto
}: {
  icono: NombreIcono;
  etiqueta: string;
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
  deshabilitado?: boolean;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}) {
  return (
    <button
      {...resto}
      type="button"
      class="btn-icono"
      aria-label={etiqueta}
      aria-disabled={deshabilitado ? "true" : undefined}
      onClick={(e) => {
        if (deshabilitado) return;
        onClick?.(e);
      }}
    >
      <Icono nombre={icono} />
    </button>
  );
}
