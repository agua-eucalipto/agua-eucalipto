import { useState } from "preact/hooks";
import type { SolicitudAcceso } from "../../api";
import { api } from "../../app/servicios";
import { Aviso, Boton, CampoGrande, Dialogo } from "../../componentes";
import { coordinador } from "../../textos";
import { telefonoLegible } from "./formato";

const t = coordinador.solicitudes;

type Accion = { tipo: "aprobar" | "rechazar"; solicitud: SolicitudAcceso };

/** "Eucalipto 10" → "10"; "Naranjo 8" → "8"; sin número → "". */
function casaSugerida(texto: string): string {
  return /(\d+[A-Za-z]?)\s*$/.exec(texto)?.[1] ?? "";
}

export function Solicitudes({
  solicitudes,
  alCambiar,
  alNoAutorizado,
}: {
  solicitudes: SolicitudAcceso[];
  alCambiar: () => void;
  alNoAutorizado: () => void;
}) {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [casa, setCasa] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [aviso, setAviso] = useState<{
    tono: "info" | "error";
    texto: string;
  } | null>(null);
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");

  function abrir(tipo: Accion["tipo"], solicitud: SolicitudAcceso) {
    setAccion({ tipo, solicitud });
    setCasa(tipo === "aprobar" ? casaSugerida(solicitud.casa_texto) : "");
    setError(undefined);
    setAviso(null);
  }

  async function confirmar() {
    if (accion === null) return;
    const aprobar = accion.tipo === "aprobar";
    if (aprobar && casa.trim() === "") {
      setError(t.casaVacia);
      return;
    }
    const r = await api.resolver_solicitud(
      accion.solicitud.id,
      aprobar,
      aprobar ? casa.trim() : undefined,
    );
    setAccion(null);
    if (r.ok) {
      setAviso({ tono: "info", texto: aprobar ? t.aprobada : t.rechazada });
    } else if (r.error === "NO_AUTORIZADO") {
      alNoAutorizado();
      return;
    } else if (r.error === "YA_RESUELTA") {
      setAviso({ tono: "error", texto: t.yaResuelta });
    } else {
      setAviso({ tono: "error", texto: coordinador.fallo });
    }
    alCambiar();
  }

  return (
    <section
      class="seccion coordinador-seccion"
      aria-labelledby="h-solicitudes"
    >
      <h2 id="h-solicitudes" class="coordinador-subtitulo">
        {t.titulo(pendientes.length)}
      </h2>
      <div aria-live="polite">
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      </div>
      {pendientes.length === 0 ? (
        <p class="fecha">{t.vacia}</p>
      ) : (
        <ul class="lista">
          {pendientes.map((s) => (
            <li key={s.id}>
              <article class="tarjeta tarjeta--plana">
                <p class="tiempo">{s.casa_texto}</p>
                <p class="fecha">
                  {telefonoLegible(s.telefono)} ·{" "}
                  {s.motivo === "casa_fuera_de_catalogo"
                    ? t.motivoCasa
                    : t.motivoTelefono}
                </p>
                <div class="acciones">
                  <Boton
                    variante="primario"
                    onClick={() => abrir("aprobar", s)}
                  >
                    {t.aprobar}
                  </Boton>
                  <Boton
                    variante="secundario"
                    onClick={() => abrir("rechazar", s)}
                  >
                    {t.rechazar}
                  </Boton>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {accion !== null ? (
        <Dialogo
          titulo={
            accion.tipo === "aprobar"
              ? t.tituloAprobar(accion.solicitud.casa_texto)
              : t.tituloRechazar(accion.solicitud.casa_texto)
          }
          descripcion={
            accion.tipo === "aprobar"
              ? t.descripcionAprobar
              : t.descripcionRechazar
          }
          onCerrar={() => setAccion(null)}
        >
          {accion.tipo === "aprobar" ? (
            <>
              <CampoGrande
                id="solicitud-casa"
                etiqueta={t.campoCasa}
                ayuda={t.ayudaCasa}
                valor={casa}
                onInput={(v) => {
                  setCasa(v);
                  setError(undefined);
                }}
                error={error}
                autoCapitalize="characters"
              />
              {accion.solicitud.motivo === "casa_fuera_de_catalogo" ? (
                <p class="fecha">{t.avisoExcepcion}</p>
              ) : null}
            </>
          ) : null}
          <div class="acciones acciones--pila">
            <Boton
              variante="primario"
              ancho
              focoInicial={accion.tipo === "rechazar"}
              onClick={() => void confirmar()}
            >
              {accion.tipo === "aprobar" ? t.siAprobar : t.siRechazar}
            </Boton>
            <Boton variante="secundario" ancho onClick={() => setAccion(null)}>
              {t.cancelar}
            </Boton>
          </div>
        </Dialogo>
      ) : null}
    </section>
  );
}
