import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useId, useRef } from "preact/hooks";
import { comun } from "../../textos";

const FOCALIZABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pantalla completa debajo de la barra del demo. Deja inerte el resto de la
 * app (menos la barra, para poder cambiar de perfil), lleva el foco al
 * elemento `data-foco-inicial` y lo devuelve al cerrar. `onEscape` es opcional:
 * sin él, Escape no hace nada (p. ej. el aviso obligatorio de la primera vez).
 */
export function Capa({
  titulo,
  onEscape,
  tamano = "normal",
  children,
}: {
  titulo: string;
  onEscape?: () => void;
  tamano?: "normal" | "ancha";
  children: ComponentChildren;
}) {
  const raiz = useRef<HTMLDivElement | null>(null);
  const escape = useRef(onEscape);
  escape.current = onEscape;
  const idTitulo = useId();

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const app = document.getElementById("app");
    const inertes: Element[] = [];
    if (app) {
      for (const hijo of Array.from(app.children)) {
        if (hijo.classList.contains("barra-demo")) continue;
        hijo.setAttribute("inert", "");
        inertes.push(hijo);
      }
    }
    const barra = document.querySelector<HTMLElement>(".barra-demo");
    const medir = () => {
      const abajo = barra ? barra.getBoundingClientRect().bottom : 0;
      raiz.current?.style.setProperty(
        "--capa-arriba",
        `${Math.max(0, Math.round(abajo))}px`,
      );
    };
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, { passive: true });

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escape.current) {
        e.preventDefault();
        escape.current();
        return;
      }
      if (e.key !== "Tab") return;
      const dentro = raiz.current;
      if (!dentro) return;
      const lista = Array.from(
        dentro.querySelectorAll<HTMLElement>(FOCALIZABLES),
      );
      if (lista.length === 0) return;
      const primero = lista[0]!;
      const ultimo = lista[lista.length - 1]!;
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || !dentro.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (
        !e.shiftKey &&
        (activo === ultimo || !dentro.contains(activo))
      ) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir);
      for (const el of inertes) el.removeAttribute("inert");
      if (previo && document.contains(previo)) previo.focus?.();
    };
  }, []);

  useEffect(() => {
    const dentro = raiz.current;
    if (!dentro || dentro.contains(document.activeElement)) return;
    const inicial =
      dentro.querySelector<HTMLElement>("[data-foco-inicial]") ??
      dentro.querySelector<HTMLElement>(FOCALIZABLES);
    inicial?.focus({ preventScroll: true });
  });

  return createPortal(
    <div
      ref={raiz}
      class={`capa${tamano === "ancha" ? " capa--ancha" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
    >
      <div class="capa__hoja">
        <div class="capa__marca" aria-hidden="true">
          <span class="marca__nombre">{comun.marca.nombre}</span>
        </div>
        <h2 class="capa__titulo" id={idTitulo}>
          {titulo}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
