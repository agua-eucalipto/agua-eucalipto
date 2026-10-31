import { useEffect, useState } from "preact/hooks";
import type { EventoVista } from "../../api";
import { api, reloj, sesion } from "../../app/servicios";
import { Aviso, Boton } from "../../componentes";
import { info } from "../../textos";
import { hace, queHizo, quien } from "./bitacora-texto";

export const TAMANO_PAGINA = 20;
const t = info.bitacora;

/** Bitácora pública paginada: los más nuevos primero, con «Ver más». */
export function Bitacora() {
  const casa = sesion.value.casa;
  const ahora = reloj.value;
  const [eventos, setEventos] = useState<EventoVista[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function cargar(antesDe?: number) {
    setCargando(true);
    try {
      const r = await api.bitacora(antesDe, TAMANO_PAGINA);
      if (!r.ok) {
        setEventos([]);
        setHayMas(false);
        return;
      }
      setEventos((previos) =>
        antesDe === undefined ? r.datos : [...previos, ...r.datos],
      );
      setHayMas(r.datos.length === TAMANO_PAGINA);
    } finally {
      setCargando(false);
      setListo(true);
    }
  }

  useEffect(() => {
    setEventos([]);
    setListo(false);
    if (casa === null) {
      setListo(true);
      return;
    }
    void cargar();
  }, [casa]);

  if (casa === null) return <Aviso tono="atencion">{t.sinSesion}</Aviso>;
  if (listo && eventos.length === 0) return <p class="nota">{t.vacia}</p>;

  return (
    <>
      <p class="nota">{t.intro}</p>
      <ol class="bitacora" aria-busy={cargando ? "true" : undefined}>
        {eventos.map((e) => (
          <li class="bitacora__evento" key={e.id}>
            <span class="bitacora__texto">
              <strong>{quien(e)}</strong> {queHizo(e)}
            </span>
            <span class="bitacora__cuando">{hace(e.ocurrido_at, ahora)}</span>
          </li>
        ))}
      </ol>
      {hayMas ? (
        <Boton
          ancho
          deshabilitado={cargando}
          onClick={() => {
            const ultimo = eventos[eventos.length - 1];
            if (ultimo) void cargar(ultimo.id);
          }}
        >
          {cargando ? t.cargando : t.verMas}
        </Boton>
      ) : null}
    </>
  );
}
