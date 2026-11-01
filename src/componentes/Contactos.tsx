import { comun } from "../textos";

const t = comun.contactos;

/**
 * Teléfonos públicos del SIAPA y del Gobierno de Zapopan.
 * Cada enlace mide al menos 48 px porque usa la clase `btn`.
 */
export function ContactosOficiales({ idTitulo }: { idTitulo?: string }) {
  return (
    <div class="contactos">
      {idTitulo ? (
        <h3 class="contactos__titulo" id={idTitulo}>
          {t.titulo}
        </h3>
      ) : null}
      <p>{t.ayuda}</p>
      <ul class="lista">
        {t.enlaces.map((enlace) => {
          const externo = enlace.href.startsWith("http");
          return (
            <li key={enlace.href}>
              <a
                class="btn btn--secundario btn--ancho btn--contacto"
                href={enlace.href}
                target={externo ? "_blank" : undefined}
                rel={externo ? "noopener noreferrer" : undefined}
              >
                <span>{enlace.nombre}</span>
                <span>{enlace.numero}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
