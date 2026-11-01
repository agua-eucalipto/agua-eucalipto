import { useEffect, useRef, useState } from "preact/hooks";
import type { NivelAljibe, ReporteAljibeVista } from "../../api";
import { fechaCorta } from "../../app/formato";
import { api, reloj, sesion } from "../../app/servicios";
import {
  Aviso,
  Boton,
  Icono,
  Tarjeta,
  type NombreIcono,
} from "../../componentes";
import { NIVELES_ALJIBE } from "../../dominio";
import { aljibe } from "../../textos";
import "../aljibe.css";

const ICONO: Record<NivelAljibe, NombreIcono> = {
  vacio: "aljibe-vacio",
  bajo: "aljibe-bajo",
  medio: "aljibe-medio",
  lleno: "aljibe-lleno",
};

/** Tarjeta de Folios: el vecino reporta el nivel y, si quiere, una foto. */
export function NivelAljibe() {
  const casa = sesion.value.casa;
  const ahora = reloj.value;
  const [reporte, setReporte] = useState<ReporteAljibeVista | null>(null);
  const [nivel, setNivel] = useState<NivelAljibe | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    setArchivo(null);
    setMensaje("");
    setError("");
    void (async () => {
      try {
        const r = await api.mi_reporte_aljibe();
        if (!vivo) return;
        if (r.ok) {
          setReporte(r.datos);
          setNivel((actual) => actual ?? r.datos?.nivel ?? null);
        }
      } catch {
        if (vivo) setError(aljibe.fallo);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [casa, ahora]);

  const guardar = async () => {
    if (nivel === null) {
      setError(aljibe.elige);
      setMensaje("");
      return;
    }
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      const elegido = fotoRef.current?.files?.[0] ?? archivo;
      const foto =
        elegido == null
          ? null
          : {
              bytes: new Uint8Array(await elegido.arrayBuffer()),
              tipo: elegido.type,
            };
      const r = await api.reportar_nivel_aljibe(nivel, foto);
      if (!r.ok) {
        setError(aljibe.fallo);
        return;
      }
      setReporte(r.datos);
      setArchivo(null);
      if (fotoRef.current) fotoRef.current.value = "";
      setMensaje(aljibe.listo);
    } catch {
      setError(aljibe.fallo);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Tarjeta etiqueta={aljibe.titulo}>
      <h2>{aljibe.titulo}</h2>
      <p>{aljibe.ayuda}</p>
      <div class="aljibe-niveles" role="group" aria-label={aljibe.grupo}>
        {NIVELES_ALJIBE.map((id) => (
          <button
            key={id}
            type="button"
            class={
              nivel === id
                ? "btn btn--primario aljibe-nivel"
                : "btn btn--secundario aljibe-nivel"
            }
            aria-pressed={nivel === id}
            onClick={() => setNivel(id)}
          >
            <Icono nombre={ICONO[id]} />
            {aljibe.niveles[id]}
          </button>
        ))}
      </div>
      <label class="aljibe-foto" for="foto-aljibe">
        {aljibe.foto}
        <input
          id="foto-aljibe"
          ref={fotoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={() => {
            setArchivo(fotoRef.current?.files?.[0] ?? null);
          }}
        />
      </label>
      {archivo !== null ? <p>{aljibe.fotoLista}</p> : null}
      <p>{aljibe.notaFoto}</p>
      <Boton
        variante="primario"
        ancho
        deshabilitado={ocupado}
        onClick={() => void guardar()}
      >
        {ocupado ? aljibe.guardando : aljibe.guardar}
      </Boton>
      {error !== "" ? <Aviso tono="error">{error}</Aviso> : null}
      {mensaje !== "" ? <Aviso>{mensaje}</Aviso> : null}
      {reporte === null ? (
        <p>{aljibe.sinReporte}</p>
      ) : (
        <>
          <p>{aljibe.ultimo(fechaCorta(reporte.reportado_at))}</p>
          <p>
            {aljibe.niveles[reporte.nivel]}
            {reporte.camara !== null
              ? ` · ${aljibe.camara(reporte.camara)}`
              : ""}
          </p>
          {reporte.marcas.length > 0 ? (
            <ul class="aljibe-marcas">
              {reporte.marcas.map((marca) => (
                <li key={marca}>{aljibe.marcas[marca]}</li>
              ))}
            </ul>
          ) : null}
          {reporte.foto_url !== null ? (
            <img
              class="aljibe-foto-previa"
              src={reporte.foto_url}
              alt="Foto de tu aljibe"
            />
          ) : null}
        </>
      )}
    </Tarjeta>
  );
}
