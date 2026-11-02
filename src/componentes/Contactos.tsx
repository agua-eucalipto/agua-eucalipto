import { useState } from "preact/hooks";
import { comun } from "../textos";
import { Boton } from "./Boton";
import { Dialogo } from "./Dialogo";

const t = comun.contactos;

type Contacto = (typeof t.lista)[number];

/**
 * Teléfonos públicos del SIAPA y del Gobierno de Zapopan.
 * Cada línea mide al menos 48 px (`min-height: var(--toque-min)`).
 * Al tocarla se abre un diálogo; no llama ni abre WhatsApp directo.
 */
export function ContactosOficiales({ idTitulo }: { idTitulo?: string }) {
  const [abierto, setAbierto] = useState<Contacto | null>(null);
  return (
    <div class="contactos">
      <h3 class="contactos__titulo" id={idTitulo}>
        {t.titulo}
      </h3>
      <ul class="contactos__lista">
        {t.lista.map((contacto) => (
          <li key={contacto.tel}>
            <button
              type="button"
              class="enlace-contacto"
              aria-haspopup="dialog"
              onClick={() => setAbierto(contacto)}
            >
              <span>{contacto.nombre}</span>
              <span class="enlace-contacto__numero">{contacto.numero}</span>
            </button>
          </li>
        ))}
      </ul>
      {abierto ? (
        <DialogoDeContacto
          contacto={abierto}
          onCerrar={() => setAbierto(null)}
        />
      ) : null}
    </div>
  );
}

function DialogoDeContacto({
  contacto,
  onCerrar,
}: {
  contacto: Contacto;
  onCerrar: () => void;
}) {
  return (
    <Dialogo titulo={t.introduccion(contacto.nombre)} onCerrar={onCerrar}>
      <p class="contacto-numero">{contacto.numero}</p>
      <a
        class="btn btn--primario btn--ancho"
        href={contacto.tel}
        data-foco-inicial
      >
        {t.llamar}
      </a>
      {contacto.whatsapp ? (
        <a
          class="btn btn--secundario btn--ancho"
          href={contacto.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.mensaje}
        </a>
      ) : null}
      <Boton variante="texto" ancho onClick={onCerrar}>
        {t.cancelar}
      </Boton>
    </Dialogo>
  );
}
