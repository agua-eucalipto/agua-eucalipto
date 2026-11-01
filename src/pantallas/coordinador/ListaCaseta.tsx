import { useEffect, useRef, useState } from "preact/hooks";
import type { ListaCaseta as Lista } from "../../api";
import { api } from "../../app/servicios";
import { Aviso, Boton, Casilla, Nota } from "../../componentes";
import { coordinador } from "../../textos";
import { canalTexto, diasTexto, fechaLista, textoWhatsApp } from "./formato";

const t = coordinador.caseta;

type Mensaje = { tono: "info" | "error"; texto: string } | null;

/** Fecha del último envío, leída de la bitácora pública. */
async function ultimoEnvio(): Promise<number | null> {
  const r = await api.bitacora(undefined, 200);
  if (!r.ok) return null;
  return (
    r.datos.find((e) => e.tipo === "lista_caseta_generada")?.ocurrido_at ?? null
  );
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function ListaParaCaseta({
  alNoAutorizado,
}: {
  alNoAutorizado: () => void;
}) {
  const [canal, setCanal] = useState(true);
  const [dias, setDias] = useState(true);
  const [lista, setLista] = useState<Lista | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Mensaje>(null);
  const [textoManual, setTextoManual] = useState<string | null>(null);
  const [ultima, setUltima] = useState<number | null>(null);
  const imprimirAlPintar = useRef(false);

  useEffect(() => {
    void ultimoEnvio().then(setUltima);
  }, []);

  useEffect(() => {
    if (lista !== null && imprimirAlPintar.current) {
      imprimirAlPintar.current = false;
      window.print();
    }
  }, [lista]);

  /** Genera la lista (queda registrada como envío) y la deja en pantalla. */
  async function generar(formato: "imprimir" | "whatsapp") {
    setOcupado(true);
    setAviso(null);
    setTextoManual(null);
    try {
      const r = await api.generar_lista_caseta({ canal, dias, formato });
      if (!r.ok) {
        if (r.error === "NO_AUTORIZADO") alNoAutorizado();
        else setAviso({ tono: "error", texto: coordinador.fallo });
        return null;
      }
      setLista(r.datos);
      setUltima(r.datos.generada_at);
      return r.datos;
    } catch {
      setAviso({ tono: "error", texto: coordinador.fallo });
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function imprimir() {
    imprimirAlPintar.current = true;
    const datos = await generar("imprimir");
    if (datos === null) imprimirAlPintar.current = false;
  }

  async function copiar() {
    const datos = await generar("whatsapp");
    if (datos === null) return;
    const texto = textoWhatsApp(datos, { canal, dias });
    if (await copiarAlPortapapeles(texto)) {
      setAviso({ tono: "info", texto: t.copiado });
    } else {
      setTextoManual(texto);
      setAviso({ tono: "error", texto: t.noCopiado });
    }
  }

  return (
    <section class="tarjeta caseta" aria-labelledby="h-caseta">
      <h2 id="h-caseta" class="coordinador-subtitulo">
        {t.titulo}
      </h2>
      <div class="coordinador-impresion">
        <p class="coordinador-impresion__titulo">
          {t.encabezadoWhatsApp.replace(/\*/g, "")}
        </p>
        {lista ? <p>{fechaLista(lista.generada_at, true)}</p> : null}
      </div>
      <fieldset class="no-imprimir coordinador-opciones">
        <legend class="solo-lector">{t.columnasOpcionales}</legend>
        <Casilla id="caseta-canal" marcada={canal} onCambio={setCanal}>
          {t.incluirCanal}
        </Casilla>
        <Casilla id="caseta-dias" marcada={dias} onCambio={setDias}>
          {t.incluirDias}
        </Casilla>
      </fieldset>

      {lista !== null ? (
        lista.filas.length === 0 ? (
          <p class="aviso">{t.vacia}</p>
        ) : (
          <TablaCaseta lista={lista} canal={canal} dias={dias} />
        )
      ) : null}
      {lista !== null ? (
        <p class="fecha caseta__total">
          {t.total(lista.total_casas, lista.total_folios)}
        </p>
      ) : null}

      <div class="acciones acciones--pila no-imprimir">
        <Boton
          variante="primario"
          icono="copiar"
          deshabilitado={ocupado}
          onClick={() => void copiar()}
        >
          {t.copiar}
        </Boton>
        <Boton
          variante="secundario"
          icono="impresora"
          deshabilitado={ocupado}
          onClick={() => void imprimir()}
        >
          {t.imprimir}
        </Boton>
      </div>
      <div class="no-imprimir" aria-live="polite">
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      </div>
      {textoManual !== null ? (
        <textarea
          class="caseta__texto no-imprimir"
          readOnly
          rows={8}
          aria-label={t.textoWhatsApp}
          value={textoManual}
        />
      ) : null}
      <div class="no-imprimir">
        <Nota>
          {ultima === null
            ? `${t.nota} ${t.sinUltima}`
            : `${t.nota} ${t.ultima(fechaLista(ultima))}`}
        </Nota>
      </div>
    </section>
  );
}

function TablaCaseta({
  lista,
  canal,
  dias,
}: {
  lista: Lista;
  canal: boolean;
  dias: boolean;
}) {
  return (
    <div class="tabla-envoltura">
      <table class="tabla">
        <caption class="solo-lector">{t.vistaPrevia}</caption>
        <thead>
          <tr>
            <th scope="col">{t.colCasa}</th>
            <th scope="col">{t.colFolio}</th>
            {canal ? (
              <th scope="col" class="solo-escritorio">
                {t.colCanal}
              </th>
            ) : null}
            {dias ? (
              <th scope="col" class="solo-escritorio">
                {t.colDias}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {lista.filas.map((fila) =>
            fila.folios.map((f, i) => {
              const extras = [
                ...(canal ? [canalTexto(f.canal)] : []),
                ...(dias ? [diasTexto(f.dias_que_lleva)] : []),
              ];
              return (
                <tr key={f.codigo}>
                  {i === 0 ? (
                    <th scope="rowgroup" rowSpan={fila.folios.length}>
                      {t.casa(fila.casa_numero)}
                    </th>
                  ) : null}
                  <td>
                    <span class="codigo-chico">{f.codigo}</span>
                    {extras.length > 0 ? (
                      <span class="fecha solo-movil">{extras.join(" · ")}</span>
                    ) : null}
                  </td>
                  {canal ? (
                    <td class="solo-escritorio">{canalTexto(f.canal)}</td>
                  ) : null}
                  {dias ? (
                    <td class="solo-escritorio">
                      {diasTexto(f.dias_que_lleva)}
                    </td>
                  ) : null}
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
