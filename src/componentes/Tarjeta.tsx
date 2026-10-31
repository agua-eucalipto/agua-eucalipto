import type { ComponentChildren } from "preact";
import { Icono, type NombreIcono } from "./Icono";

type VarianteTarjeta = "normal" | "plana" | "historial";

export function Tarjeta({
  etiqueta,
  variante = "normal",
  children,
}: {
  /** Nombre accesible, p. ej. "Folio SIAPAZAP20261001". */
  etiqueta: string;
  variante?: VarianteTarjeta;
  children: ComponentChildren;
}) {
  const extra = variante === "normal" ? "" : ` tarjeta--${variante}`;
  return (
    <article class={`tarjeta${extra}`} aria-label={etiqueta}>
      {children}
    </article>
  );
}

export function CabezaTarjeta({ children }: { children: ComponentChildren }) {
  return <div class="tarjeta__cabeza">{children}</div>;
}

export function Acciones({
  children,
  pila = false,
}: {
  children: ComponentChildren;
  pila?: boolean;
}) {
  return (
    <div class={pila ? "acciones acciones--pila" : "acciones"}>{children}</div>
  );
}

export function Nota({
  icono,
  children,
}: {
  icono?: NombreIcono;
  children: ComponentChildren;
}) {
  return (
    <p class="nota">
      {icono ? <Icono nombre={icono} chico /> : null}
      <span>{children}</span>
    </p>
  );
}

/** Tarjeta de folio, solo presentación: recibe todo ya formateado. */
export interface PropsTarjetaFolio {
  insignia: ComponentChildren;
  canal: { icono: NombreIcono; texto: string };
  codigo: string;
  tachado?: boolean;
  tiempo: string;
  fecha: string;
  notas?: { icono?: NombreIcono; texto: string }[];
  acciones?: ComponentChildren;
  historial?: boolean;
}

export function TarjetaFolio(p: PropsTarjetaFolio) {
  return (
    <Tarjeta
      etiqueta={`Folio ${p.codigo}`}
      variante={p.historial ? "historial" : "normal"}
    >
      <CabezaTarjeta>
        {p.insignia}
        <span class="canal">
          <Icono nombre={p.canal.icono} />
          {p.canal.texto}
        </span>
      </CabezaTarjeta>
      <p class={p.tachado ? "codigo codigo--tachado" : "codigo"}>{p.codigo}</p>
      <div>
        <p class="tiempo">{p.tiempo}</p>
        <p class="fecha">{p.fecha}</p>
      </div>
      {p.notas?.map((n) => (
        <Nota key={n.texto} icono={n.icono}>
          {n.texto}
        </Nota>
      ))}
      {p.acciones ? <Acciones>{p.acciones}</Acciones> : null}
    </Tarjeta>
  );
}

/** Tarjeta de viaje, solo presentación. */
export interface PropsTarjetaViaje {
  proveedor: string;
  insignia: ComponentChildren;
  avance?: ComponentChildren;
  detalles?: string[];
  marcas?: ComponentChildren;
  acciones?: ComponentChildren;
}

export function TarjetaViaje(p: PropsTarjetaViaje) {
  return (
    <Tarjeta etiqueta={`Viaje ${p.proveedor}`}>
      <CabezaTarjeta>
        <h3>{p.proveedor}</h3>
        {p.insignia}
      </CabezaTarjeta>
      {p.avance}
      {p.detalles?.map((d) => (
        <p key={d} class="tiempo">
          {d}
        </p>
      ))}
      {p.marcas}
      {p.acciones ? <Acciones>{p.acciones}</Acciones> : null}
    </Tarjeta>
  );
}
