import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useId, useRef, useState } from "preact/hooks";

const FOCALIZABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo de confirmación: hoja inferior en móvil y caja centrada en escritorio.
 * Atrapa el foco, cierra con Escape, deja el resto de la app inerte y devuelve
 * el foco a quien lo abrió. El foco inicial cae en el elemento `data-foco-inicial`
 * (la acción principal); si no hay, en el primer elemento enfocable.
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
    document.body.appendChild(anfitrion);
    const previo = document.activeElement as HTMLElement | null;
    const app = document.getElementById("app");
    app?.setAttribute("inert", "");
    app?.setAttribute("aria-hidden", "true");

    const alTeclear = (e: KeyboardEvent) => {
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
      anfitrion.remove();
      app?.removeAttribute("inert");
      app?.removeAttribute("aria-hidden");
      previo?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (!anfitrion.contains(document.activeElement)) {
      const inicial =
        anfitrion.querySelector<HTMLElement>("[data-foco-inicial]") ??
        anfitrion.querySelector<HTMLElement>(FOCALIZABLES);
      inicial?.focus();
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
