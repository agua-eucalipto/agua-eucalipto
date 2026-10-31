import { Icono } from "../componentes";
import { textos } from "../textos";
import { rutaActual, type Ruta } from "./ruta";

const { comun } = textos;

const PESTANAS: { ruta: Ruta; icono: "folio" | "pipa"; texto: string }[] = [
  { ruta: "siapa", icono: "folio", texto: comun.navegacion.siapa },
  { ruta: "pipas", icono: "pipa", texto: comun.navegacion.pipas },
];

/** Las dos pestañas: abajo en móvil (`pestanas`) y en el encabezado en escritorio. */
export function Navegacion({ variante }: { variante: "movil" | "escritorio" }) {
  const actual = rutaActual.value;
  return (
    <nav
      class={variante === "movil" ? "pestanas" : "nav-escritorio"}
      aria-label={comun.navegacion.etiqueta}
    >
      {PESTANAS.map((p) => (
        <a
          key={p.ruta}
          class="pestana"
          href={`#${p.ruta}`}
          aria-current={actual === p.ruta ? "page" : undefined}
        >
          <Icono nombre={p.icono} />
          <span>{p.texto}</span>
        </a>
      ))}
    </nav>
  );
}
