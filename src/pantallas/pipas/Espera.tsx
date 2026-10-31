import type { EsperaVista } from "../../api";
import { MarcaFila } from "../../componentes";
import { textos } from "../../textos";
import { antiguedadTexto, textoOrigenEspera } from "./formato";

const { pipas } = textos;

/** Casas en espera, con antigüedad y prioridad. Nunca muestra teléfonos. */
export function ListaEspera({
  espera,
  casa,
  ahora,
}: {
  espera: EsperaVista[];
  casa: string | null;
  ahora: number;
}) {
  return (
    <section class="seccion" aria-labelledby="h-espera">
      <h2 id="h-espera">{pipas.secciones.espera}</h2>
      {espera.length === 0 ? (
        <p class="fecha">{pipas.vacios.espera}</p>
      ) : (
        <div class="tarjeta tarjeta--plana">
          <ol class="filas">
            {espera.map((e, i) => (
              <li
                key={e.casa_numero}
                class={e.casa_numero === casa ? "fila fila--tu" : "fila"}
              >
                <span class="fila__num">{i + 1}</span>
                <span class="fila__casa">
                  {pipas.casas.casa(e.casa_numero)}
                </span>
                <span class="fila__marcas">
                  {e.casa_numero === casa ? (
                    <MarcaFila
                      tono="neutra"
                      icono="casa"
                      texto={pipas.casas.tuCasa}
                    />
                  ) : null}
                  {e.con_prioridad ? (
                    <MarcaFila
                      tono="prioridad"
                      icono="estrella"
                      texto={pipas.espera.conPrioridad}
                    />
                  ) : null}
                  <MarcaFila
                    tono="neutra"
                    icono="reloj"
                    texto={`${textoOrigenEspera(e)} · ${pipas.espera.desde(
                      antiguedadTexto(e.antiguedad_desde, ahora),
                    )}`}
                  />
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
