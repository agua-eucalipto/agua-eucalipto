import type { ComponentChildren } from "preact";
import { Icono, type NombreIcono } from "./Icono";

type TonoAviso = "info" | "atencion" | "error";

const ICONO: Record<TonoAviso, NombreIcono> = {
  info: "info",
  atencion: "alerta",
  error: "x-circulo",
};

export function Aviso({
  tono = "info",
  children,
}: {
  tono?: TonoAviso;
  children: ComponentChildren;
}) {
  const clase = tono === "info" ? "aviso" : `aviso aviso--${tono}`;
  return (
    <p class={clase} role={tono === "error" ? "alert" : undefined}>
      <Icono nombre={ICONO[tono]} />
      <span>{children}</span>
    </p>
  );
}

export function TituloPantalla({
  titulo,
  resumen,
  id,
}: {
  titulo: string;
  resumen?: string;
  id?: string;
}) {
  return (
    <div class="titulo-pantalla">
      <h1 id={id} tabIndex={-1}>
        {titulo}
      </h1>
      {resumen ? <p class="titulo-pantalla__resumen">{resumen}</p> : null}
    </div>
  );
}

/** Contenedor de una pantalla que aún no tiene contenido. */
export function PantallaVacia({ children }: { children: ComponentChildren }) {
  return <p class="pantalla-vacia">{children}</p>;
}
