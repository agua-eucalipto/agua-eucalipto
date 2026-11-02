import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useId, useRef, useState } from "preact/hooks";

const FOCALIZABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Del más antiguo al de encima. Solo el último atrapa el foco y cierra con Escape. */
const pila: HTMLElement[] = [];

function enfocable(raiz: ParentNode): HTMLElement | null {
  return (
    raiz.querySelector<HTMLElement>("[data-foco-inicial]") ??
    raiz.querySelector<HTMLElement>(FOCALIZABLES)
  );
}

/**
 * Diálogo de confirmación: hoja inferior en móvil y caja centrada en escritorio.
 * Atrapa el foco, cierra con Escape, deja el resto de la app inerte y devuelve
 * el foco a quien lo abrió. El foco inicial cae en el elemento `data-foco-inicial`
 * (la acción principal); si no hay, en el primer elemento enfocable.
 * Otro diálogo puede abrirse encima: el de abajo sigue montado y no pierde
 * lo que se escribió. Escape y el velo cierran solo el de arriba.
 */
export function Dialogo({
  titulo,
  descripcion,
  onCerrar,
  children,
}: {
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ComponentChildren;
}) {
  const [anfitrion] = useState(() => document.createElement("div"));
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  const idTitulo = useId();
  const idDescripcion = useId();

  useEffect(() => {
    anfitrion.style.position = "relative";
    document.body.appendChild(anfitrion);
    pila.push(anfitrion);
    anfitrion.style.zIndex = String(40 + pila.length * 2);
    const previo = document.activeElement as HTMLElement | null;
    const app = document.getElementById("app");
    if (pila.length === 1) {
      app?.setAttribute("inert", "");
      app?.setAttribute("aria-hidden", "true");
    }

    const alTeclear = (e: KeyboardEvent) => {
      if (pila[pila.length - 1] !== anfitrion) return;
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = Array.from(
        anfitrion.querySelectorAll<HTMLElement>(FOCALIZABLES),
      );
      if (lista.length === 0) return;
      const primero = lista[0]!;
      const ultimo = lista[lista.length - 1]!;
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || !anfitrion.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (
        !e.shiftKey &&
        (activo === ultimo || !anfitrion.contains(activo))
      ) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      const indice = pila.indexOf(anfitrion);
      if (indice >= 0) pila.splice(indice, 1);
      anfitrion.remove();
      if (pila.length === 0) {
        app?.removeAttribute("inert");
        app?.removeAttribute("aria-hidden");
        previo?.focus?.();
        return;
      }
      const abajo = pila[pila.length - 1]!;
      if (previo && abajo.contains(previo)) previo.focus();
      else enfocable(abajo)?.focus();
    };
  }, []);

  useEffect(() => {
    if (pila[pila.length - 1] !== anfitrion) return;
    if (!anfitrion.contains(document.activeElement)) {
      enfocable(anfitrion)?.focus();
    }
  });

  return createPortal(
    <>
      <div class="velo" onClick={() => cerrar.current()} />
      <div
        class="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined}
      >
        <h2 id={idTitulo}>{titulo}</h2>
        {descripcion ? <p id={idDescripcion}>{descripcion}</p> : null}
        {children}
      </div>
    </>,
    anfitrion,
  );
}
