import type { ComponentChildren } from "preact";
import { Boton, ContactosOficiales } from "../../componentes";
import { info } from "../../textos";
import { verIntroduccionOtraVez } from "../acceso";
import { Bitacora } from "./Bitacora";
import "./info.css";

const t = info;

function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ComponentChildren;
}) {
  return (
    <section class="info-seccion" id={id} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      {children}
    </section>
  );
}

function Reglas({
  titulo,
  lista,
}: {
  titulo: string;
  lista: readonly string[];
}) {
  return (
    <div class="tarjeta tarjeta--plana">
      <h3>{titulo}</h3>
      <ol class="reglas">
        {lista.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
    </div>
  );
}

/** Información (ⓘ): resumen, reglas, bitácora, privacidad y el tutorial otra vez. */
export function PantallaInfo() {
  const r = t.resumen;
  return (
    <div class="info">
      <nav class="info-indice" aria-label="En esta pantalla">
        <a
          class="btn btn--secundario"
          href="#resumen-info"
          onClick={irA("resumen-info")}
        >
          {t.secciones.resumen}
        </a>
        <a
          class="btn btn--secundario"
          href="#contactos-info"
          onClick={irA("contactos-info")}
        >
          {t.secciones.contactos}
        </a>
        <a
          class="btn btn--secundario"
          href="#reglas-info"
          onClick={irA("reglas-info")}
        >
          {t.secciones.reglas}
        </a>
        <a
          class="btn btn--secundario"
          href="#bitacora-info"
          onClick={irA("bitacora-info")}
        >
          {t.secciones.bitacora}
        </a>
        <a
          class="btn btn--secundario"
          href="#privacidad-info"
          onClick={irA("privacidad-info")}
        >
          {t.secciones.privacidad}
        </a>
      </nav>

      <Seccion id="resumen-info" titulo={t.secciones.resumen}>
        {[r.queEs, r.porQue, r.comoFunciona].map((p) => (
          <div key={p.titulo}>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </div>
        ))}
        <p class="info-piloto">
          <strong>{r.piloto.negrita}</strong> {r.piloto.texto}
        </p>
        <div class="info-tutorial">
          <p>{t.tutorial.texto}</p>
          <Boton onClick={verIntroduccionOtraVez}>{t.tutorial.boton}</Boton>
        </div>
      </Seccion>

      <Seccion id="contactos-info" titulo={t.secciones.contactos}>
        <ContactosOficiales />
      </Seccion>

      <Seccion id="reglas-info" titulo={t.secciones.reglas}>
        <Reglas titulo={t.reglas.folios.titulo} lista={t.reglas.folios.lista} />
        <Reglas titulo={t.reglas.pipas.titulo} lista={t.reglas.pipas.lista} />
        <p>{t.reglas.iguales}</p>
      </Seccion>

      <Seccion id="bitacora-info" titulo={t.secciones.bitacora}>
        <Bitacora />
      </Seccion>

      <Seccion id="privacidad-info" titulo={t.secciones.privacidad}>
        <ul class="privacidad">
          {t.privacidad.lineas.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Seccion>
    </div>
  );
}

/** Los enlaces `#…` del índice no deben cambiar la ruta del hash: solo desplazan. */
function irA(id: string) {
  return (e: MouseEvent) => {
    e.preventDefault();
    const destino = document.getElementById(id);
    destino?.scrollIntoView({ block: "start" });
    destino?.querySelector("h2")?.setAttribute("tabindex", "-1");
    destino?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  };
}
