import { useEffect, useRef, useState } from "preact/hooks";
import type { Canal, CodigoError, FolioVista } from "../../api";
import { Aviso, Boton, CampoGrande, Casilla, Dialogo } from "../../componentes";
import { VIGENCIA_MAXIMA_FOLIO_MS } from "../../dominio";
import { api } from "../../app/servicios";
import { fechaCorta } from "../../app/formato";
import { siapa } from "../../textos";
import { canalEscrito } from "./util";

const textoDeError = (e: CodigoError) => siapa.errores[e] ?? siapa.fallo;

interface Cierre {
  onCerrar: () => void;
  /** Cierra y avisa lo que pasó; la pantalla vuelve a leer. */
  onHecho: (mensaje: string) => void;
}

/**
 * Registrar un folio nuevo, o reemplazar uno (desde su tarjeta o por tope).
 *
 * Cada diálogo guarda su estado en un cuerpo propio y deja `Dialogo` con
 * propiedades fijas: así `Dialogo` no se vuelve a pintar mientras se escribe
 * o se espera a la `Api`.
 */
export function DialogoRegistro(p: Cierre & { reemplaza?: FolioVista }) {
  return (
    <Dialogo titulo={siapa.registro.titulo} onCerrar={p.onCerrar}>
      <CuerpoRegistro {...p} />
    </Dialogo>
  );
}

function CuerpoRegistro({
  reemplaza,
  onCerrar,
  onHecho,
}: Cierre & { reemplaza?: FolioVista }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const ocupado = useRef(false);
  const [candidatos, setCandidatos] = useState<FolioVista[] | null>(null);
  const [canalLleno, setCanalLleno] = useState<Canal | null>(null);
  const [elegido, setElegido] = useState<FolioVista | null>(null);

  const formulario = useRef<HTMLFormElement>(null);

  // Al elegir cuál reemplazar desaparece el botón tocado: el foco pasa a la
  // acción principal, como hace `Dialogo` al abrirse.
  useEffect(() => {
    if (elegido) {
      formulario.current
        ?.querySelector<HTMLElement>("[data-foco-inicial]")
        ?.focus();
    }
  }, [elegido]);

  const destino = reemplaza ?? elegido;
  const canal = canalEscrito(codigo);

  const enviar = async (e?: Event) => {
    e?.preventDefault();
    if (ocupado.current) return;
    ocupado.current = true;
    setError("");
    try {
      const r = await api.registrar_folio(codigo, destino?.id);
      if (r.ok) {
        onHecho(
          destino
            ? siapa.hecho.reemplazado(r.datos.codigo)
            : siapa.hecho.registrado(r.datos.codigo),
        );
        return;
      }
      if (r.error === "TOPE_CANAL" && !destino) {
        const lista = await api.listar_folios_casa();
        const delCanal = canalEscrito(codigo);
        if (lista.ok && delCanal) {
          setCandidatos(
            lista.datos.filter(
              (f) => f.estado === "activo" && f.canal === delCanal,
            ),
          );
          setCanalLleno(delCanal);
        } else {
          setError(siapa.fallo);
        }
      } else {
        setError(textoDeError(r.error));
      }
    } catch {
      setError(siapa.fallo);
    } finally {
      ocupado.current = false;
    }
  };

  const eligiendo = candidatos !== null && canalLleno !== null && !elegido;

  return (
    <form ref={formulario} class="dialogo__cuerpo" onSubmit={enviar} noValidate>
      <CampoGrande
        id="folio-nuevo"
        etiqueta={siapa.registro.etiqueta}
        ayuda={siapa.registro.ayuda}
        valor={codigo}
        onInput={(v) => {
          setCodigo(v);
          setError("");
        }}
        error={error}
        confirmacion={canal ? siapa.registro.canalDetectado(canal) : undefined}
        autoCapitalize="characters"
        deshabilitado={eligiendo || elegido !== null}
      />
      {eligiendo && canalLleno ? (
        <>
          <Aviso tono="atencion">
            {siapa.eligeReemplazo.descripcion(canalLleno)}
          </Aviso>
          {candidatos.map((f) => (
            <Boton
              key={f.id}
              ancho
              onClick={() => setElegido(f)}
              aria-label={siapa.eligeReemplazo.opcion(f.codigo)}
            >
              {siapa.eligeReemplazo.opcion(f.codigo)}
            </Boton>
          ))}
        </>
      ) : destino ? (
        <>
          <Aviso tono="atencion">{siapa.reemplazo.aviso(destino.codigo)}</Aviso>
          <Boton
            variante="primario"
            ancho
            type="submit"
            focoInicial={elegido !== null}
          >
            {siapa.reemplazo.confirmar}
          </Boton>
        </>
      ) : (
        <Boton variante="primario" ancho type="submit">
          {siapa.registro.confirmar}
        </Boton>
      )}
      <Boton variante="texto" ancho onClick={onCerrar}>
        {siapa.registro.regresar}
      </Boton>
    </form>
  );
}

/** "Me surtieron": casilla marcada por omisión para quitar los demás activos. */
export function DialogoSurtido(
  p: Cierre & { folio: FolioVista; otrosActivos: number },
) {
  return (
    <Dialogo
      titulo={siapa.surtieron.titulo}
      descripcion={`${p.folio.codigo}. ${siapa.surtieron.descripcion}`}
      onCerrar={p.onCerrar}
    >
      <CuerpoSurtido {...p} />
    </Dialogo>
  );
}

function CuerpoSurtido({
  folio,
  otrosActivos,
  onCerrar,
  onHecho,
}: Cierre & { folio: FolioVista; otrosActivos: number }) {
  const [quemar, setQuemar] = useState(true);
  const [error, setError] = useState("");
  const ocupado = useRef(false);

  const confirmar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setError("");
    try {
      const r = await api.marcar_surtido(folio.id, quemar);
      if (r.ok) onHecho(siapa.hecho.surtido);
      else setError(textoDeError(r.error));
    } catch {
      setError(siapa.fallo);
    } finally {
      ocupado.current = false;
    }
  };

  return (
    <>
      {otrosActivos > 0 ? (
        <Casilla id="quemar-otros" marcada={quemar} onCambio={setQuemar}>
          {siapa.surtieron.quemarOtros(otrosActivos)}
        </Casilla>
      ) : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Boton variante="primario" ancho focoInicial onClick={confirmar}>
        {siapa.surtieron.confirmar}
      </Boton>
      <Boton variante="texto" ancho onClick={onCerrar}>
        {siapa.registro.regresar}
      </Boton>
    </>
  );
}

/** "Sigue pendiente": explica que es una sola vez y hasta cuándo queda. */
export function DialogoPendiente(p: Cierre & { folio: FolioVista }) {
  const hasta = fechaCorta(p.folio.registrado_at + VIGENCIA_MAXIMA_FOLIO_MS);
  return (
    <Dialogo
      titulo={siapa.pendiente.titulo}
      descripcion={`${p.folio.codigo}. ${siapa.pendiente.descripcion(hasta)}`}
      onCerrar={p.onCerrar}
    >
      <CuerpoPendiente {...p} />
    </Dialogo>
  );
}

function CuerpoPendiente({
  folio,
  onCerrar,
  onHecho,
}: Cierre & { folio: FolioVista }) {
  const [error, setError] = useState("");
  const ocupado = useRef(false);

  const confirmar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setError("");
    try {
      const r = await api.marcar_sigue_pendiente(folio.id);
      if (r.ok) onHecho(siapa.hecho.pendiente);
      else setError(textoDeError(r.error));
    } catch {
      setError(siapa.fallo);
    } finally {
      ocupado.current = false;
    }
  };

  return (
    <>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Boton variante="primario" ancho focoInicial onClick={confirmar}>
        {siapa.pendiente.confirmar}
      </Boton>
      <Boton variante="texto" ancho onClick={onCerrar}>
        {siapa.registro.regresar}
      </Boton>
    </>
  );
}
