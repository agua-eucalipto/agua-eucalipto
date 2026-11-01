import { useEffect, useState } from "preact/hooks";
import type { ReporteAljibe } from "../../api";
import { fechaCorta } from "../../app/formato";
import { api, reloj, sesion } from "../../app/servicios";
import { aljibe } from "../../textos";
import "../aljibe.css";

/**
 * Lista compacta para coordinación. La Api niega la lectura a quien no
 * coordina; aquí solo se pinta lo que ella devuelve.
 */
export function ListaAljibes() {
  const rol = sesion.value.rol;
  const ahora = reloj.value;
  const [reportes, setReportes] = useState<ReporteAljibe[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const r = await api.listar_aljibes();
        if (!vivo) return;
        setReportes(r.ok ? r.datos : null);
      } catch {
        if (vivo) setReportes(null);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [rol, ahora]);

  if (reportes === null) return null;

  return (
    <section class="seccion" aria-labelledby="h-aljibes">
      <h2 id="h-aljibes">{aljibe.listaTitulo}</h2>
      {reportes.length === 0 ? (
        <p>{aljibe.listaVacia}</p>
      ) : (
        <ul class="aljibes">
          {reportes.map((r) => (
            <li key={r.id}>
              <span>{aljibe.casa(r.casa_numero)}</span>
              <span>{aljibe.niveles[r.nivel]}</span>
              <time dateTime={new Date(r.reportado_at).toISOString()}>
                {fechaCorta(r.reportado_at)}
              </time>
              {r.marcas.map((marca) => (
                <span key={marca}>{aljibe.marcas[marca]}</span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
