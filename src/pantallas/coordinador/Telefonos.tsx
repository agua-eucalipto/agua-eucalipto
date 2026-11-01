import { useState } from "preact/hooks";
import type { TelefonoVista } from "../../api";
import { api, refrescarSesion } from "../../app/servicios";
import { Aviso, Boton, Dialogo } from "../../componentes";
import { coordinador } from "../../textos";
import { telefonoLegible } from "./formato";

const t = coordinador.telefonos;

export function Telefonos({
  telefonos,
  alCambiar,
  alNoAutorizado,
}: {
  telefonos: TelefonoVista[];
  alCambiar: () => void;
  alNoAutorizado: () => void;
}) {
  const [objetivo, setObjetivo] = useState<TelefonoVista | null>(null);
  const [aviso, setAviso] = useState<{
    tono: "info" | "error";
    texto: string;
  } | null>(null);
  const lista = telefonos.filter((x) => x.en_lista_blanca);

  async function reiniciar() {
    if (objetivo === null) return;
    const r = await api.reiniciar_telefono(objetivo.numero);
    setObjetivo(null);
    if (r.ok) {
      setAviso({ tono: "info", texto: t.listo });
      // Si era el propio teléfono de la sesión, la sesión se cierra.
      await refrescarSesion();
    } else if (r.error === "NO_AUTORIZADO") {
      alNoAutorizado();
      return;
    } else {
      setAviso({
        tono: "error",
        texto: r.error === "NO_ENCONTRADO" ? t.noEncontrado : coordinador.fallo,
      });
    }
    alCambiar();
  }

  return (
    <section class="tarjeta coordinador-seccion" aria-labelledby="h-telefonos">
      <h2 id="h-telefonos" class="coordinador-subtitulo">
        {t.titulo}
      </h2>
      <div aria-live="polite">
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      </div>
      {lista.length === 0 ? (
        <p class="fecha">{t.vacio}</p>
      ) : (
        <ul class="filas">
          {lista.map((x) => (
            <li key={x.numero} class="fila coordinador-telefono">
              <span>
                <span class="fila__casa">
                  {x.casa_numero === null
                    ? t.sinCasa
                    : coordinador.caseta.casa(x.casa_numero)}
                </span>
                <br />
                <span class="fecha coordinador-telefono__numero">
                  {telefonoLegible(x.numero)}
                  {x.es_coordinador ? ` · ${t.coordinador}` : ""}
                </span>
              </span>
              <Boton variante="secundario" onClick={() => setObjetivo(x)}>
                {t.reiniciar}
              </Boton>
            </li>
          ))}
        </ul>
      )}
      {objetivo !== null ? (
        <Dialogo
          titulo={t.tituloReiniciar(objetivo.casa_numero)}
          descripcion={t.descripcionReiniciar}
          onCerrar={() => setObjetivo(null)}
        >
          <div class="acciones acciones--pila">
            <Boton
              variante="primario"
              ancho
              focoInicial
              onClick={() => void reiniciar()}
            >
              {t.siReiniciar}
            </Boton>
            <Boton
              variante="secundario"
              ancho
              onClick={() => setObjetivo(null)}
            >
              {t.cancelar}
            </Boton>
          </div>
        </Dialogo>
      ) : null}
    </section>
  );
}
