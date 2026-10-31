import { Boton } from "../../componentes";
import { acceso } from "../../textos";
import { Capa } from "./Capa";

/** Convierte `**texto**` en negritas; el resto queda tal cual. */
export function conNegritas(texto: string) {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .map((trozo, i) =>
      trozo.startsWith("**") ? (
        <strong key={i}>{trozo.slice(2, -2)}</strong>
      ) : (
        trozo
      ),
    );
}

/** Aviso de entrada: hay que tocar «Entendido» para seguir (no se cierra con Escape). */
export function AvisoEntrada({ alEntender }: { alEntender: () => void }) {
  const t = acceso.aviso;
  return (
    <Capa titulo={t.titulo}>
      {t.parrafos.map((p) => (
        <p class="capa__texto" key={p}>
          {conNegritas(p)}
        </p>
      ))}
      <Boton variante="primario" ancho focoInicial onClick={alEntender}>
        {t.entendido}
      </Boton>
    </Capa>
  );
}
