import { useRef, useState } from "preact/hooks";
import { Boton, Icono } from "../../componentes";
import { acceso } from "../../textos";
import { Capa } from "./Capa";

const UMBRAL_DESLIZ = 48;

/** Tutorial de 4 tarjetas: Siguiente / Anterior, Saltar, o deslizar con el dedo. */
export function Tutorial({
  alTerminar,
  alEscape,
}: {
  alTerminar: () => void;
  /** Solo cuando se abrió desde ⓘ. */
  alEscape?: () => void;
}) {
  const t = acceso.tutorial;
  const [indice, setIndice] = useState(0);
  const inicioX = useRef<number | null>(null);
  const ultimo = indice === t.pasos.length - 1;
  const paso = t.pasos[indice]!;

  const ir = (delta: number) =>
    setIndice((i) => Math.min(t.pasos.length - 1, Math.max(0, i + delta)));

  return (
    <Capa titulo={t.titulo} onEscape={alEscape ?? alTerminar}>
      <div
        class="tarjeta-tutorial"
        role="group"
        aria-roledescription="tarjeta"
        aria-label={t.paso(indice + 1, t.pasos.length)}
        onPointerDown={(e) => {
          inicioX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (inicioX.current === null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if (dx <= -UMBRAL_DESLIZ) ir(1);
          else if (dx >= UMBRAL_DESLIZ) ir(-1);
        }}
        onPointerCancel={() => {
          inicioX.current = null;
        }}
      >
        <span class="tarjeta-tutorial__icono" aria-hidden="true">
          <Icono nombre={paso.icono} />
        </span>
        <p class="tarjeta-tutorial__paso">
          {t.paso(indice + 1, t.pasos.length)}
        </p>
        <h3 class="tarjeta-tutorial__titulo" aria-live="polite">
          {paso.titulo}
        </h3>
        <p class="capa__texto">{paso.texto}</p>
      </div>
      <div class="puntos" aria-hidden="true">
        {t.pasos.map((p, i) => (
          <span
            key={p.titulo}
            class={i === indice ? "punto punto--activo" : "punto"}
          />
        ))}
      </div>
      <div class="acciones acciones--capa">
        {ultimo ? (
          <Boton variante="primario" focoInicial onClick={alTerminar}>
            {t.empezar}
          </Boton>
        ) : (
          <>
            <Boton variante="primario" focoInicial onClick={() => ir(1)}>
              {t.siguiente}
            </Boton>
            <Boton variante="texto" onClick={alTerminar}>
              {t.saltar}
            </Boton>
          </>
        )}
        {indice > 0 ? (
          <Boton variante="secundario" onClick={() => ir(-1)}>
            {t.anterior}
          </Boton>
        ) : null}
      </div>
    </Capa>
  );
}
