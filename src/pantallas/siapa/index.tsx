import { useEffect, useState } from "preact/hooks";
import type { FolioVista } from "../../api";
import {
  Aviso,
  Boton,
  Insignia,
  TarjetaFolio,
  type NombreIcono,
} from "../../componentes";
import { TOPE_FOLIOS_POR_CANAL } from "../../dominio";
import { api, reloj, sesion } from "../../app/servicios";
import { fechaCorta } from "../../app/formato";
import { comun, siapa } from "../../textos";
import { DialogoPendiente, DialogoRegistro, DialogoSurtido } from "./Dialogos";
import { esHistorial, insigniaDe, porVencimiento } from "./util";

type Abierto =
  | { t: "registrar" }
  | { t: "reemplazar"; folio: FolioVista }
  | { t: "surtido"; folio: FolioVista }
  | { t: "pendiente"; folio: FolioVista }
  | null;

const TEXTO_INSIGNIA = {
  activo: siapa.insignia.activo,
  "vence-hoy": siapa.insignia.venceHoy,
  vencio: siapa.insignia.vencio,
  surtido: siapa.insignia.surtido,
  reemplazado: siapa.insignia.reemplazado,
} as Record<string, string>;

function Tarjeta({
  f,
  todos,
  abrir,
}: {
  f: FolioVista;
  todos: FolioVista[];
  abrir: (a: Abierto) => void;
}) {
  const historial = esHistorial(f);
  const estado = insigniaDe(f);
  const icono: NombreIcono = f.canal === "whatsapp" ? "chat" : "telefono";

  let tiempo = siapa.lleva(f.dias_que_lleva);
  if (f.estado === "surtido" && f.cerrado_at !== null) {
    tiempo = siapa.surtidoEl(fechaCorta(f.cerrado_at));
  } else if (f.estado === "reemplazado" && f.cerrado_at !== null) {
    tiempo = siapa.reemplazadoEl(fechaCorta(f.cerrado_at));
  }

  const notas: { icono?: NombreIcono; texto: string }[] = [];
  if (!historial && f.ultimo_envio_caseta_at !== null) {
    notas.push({
      icono: "check",
      texto: siapa.enviadoCaseta(fechaCorta(f.ultimo_envio_caseta_at)),
    });
  }
  if (!historial && f.extendido_at !== null) {
    notas.push({
      icono: "reloj",
      texto: siapa.extendido(fechaCorta(f.vence_at)),
    });
  }
  if (f.estado === "reemplazado" && f.reemplazado_por) {
    const nuevo = todos.find((x) => x.id === f.reemplazado_por);
    if (nuevo) {
      notas.push({ icono: "cambio", texto: siapa.enSuLugar(nuevo.codigo) });
    }
  }

  const acciones = historial ? undefined : (
    <>
      <Boton
        variante="primario"
        onClick={() => abrir({ t: "surtido", folio: f })}
        aria-label={`${siapa.acciones.surtieron}, folio ${f.codigo}`}
      >
        {siapa.acciones.surtieron}
      </Boton>
      {f.puede_extender ? (
        <Boton
          onClick={() => abrir({ t: "pendiente", folio: f })}
          aria-label={`${siapa.acciones.pendiente}, folio ${f.codigo}`}
        >
          {siapa.acciones.pendiente}
        </Boton>
      ) : null}
      {f.estado === "activo" ? (
        <Boton
          variante="texto"
          onClick={() => abrir({ t: "reemplazar", folio: f })}
          aria-label={`${siapa.acciones.reemplazar}, folio ${f.codigo}`}
        >
          {siapa.acciones.reemplazar}
        </Boton>
      ) : null}
    </>
  );

  return (
    <TarjetaFolio
      insignia={
        <Insignia estado={estado} texto={TEXTO_INSIGNIA[estado] ?? ""} />
      }
      canal={{ icono, texto: siapa.canal[f.canal] }}
      codigo={f.codigo}
      tachado={f.estado === "reemplazado"}
      tiempo={tiempo}
      fecha={siapa.registradoEl(fechaCorta(f.registrado_at))}
      notas={notas}
      acciones={acciones}
      historial={historial}
    />
  );
}

/** Pantalla de Folios SIAPA: solo muestra lo que devuelve la `Api`. */
export function PantallaSiapa() {
  const [folios, setFolios] = useState<FolioVista[] | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [mensaje, setMensaje] = useState("");

  // Leer `.value` aquí suscribe la pantalla: al adelantar el reloj o cambiar
  // de sesión se vuelve a pedir la lista sin recargar la página.
  const ahora = reloj.value;
  const { casa, rol } = sesion.value;

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const r = await api.listar_folios_casa();
        if (!vivo) return;
        if (r.ok) {
          setFolios(r.datos);
          setFalla(false);
        } else {
          setFalla(true);
        }
      } catch {
        if (vivo) setFalla(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ahora, casa, rol, version]);

  // Un aviso de una acción anterior no sobrevive a un cambio de día o de sesión.
  useEffect(() => setMensaje(""), [ahora, casa, rol]);

  const cerrar = () => setAbierto(null);
  const hecho = (texto: string) => {
    setAbierto(null);
    setMensaje(texto);
    setVersion((v) => v + 1);
  };

  const lista = folios ?? [];
  const vigentes = lista.filter((f) => !esHistorial(f)).sort(porVencimiento);
  const anteriores = lista
    .filter(esHistorial)
    .sort((a, b) => (b.cerrado_at ?? 0) - (a.cerrado_at ?? 0));
  const activos = lista.filter((f) => f.estado === "activo").length;
  const topeTotal = TOPE_FOLIOS_POR_CANAL * 2;

  return (
    <>
      {casa !== null && folios !== null ? (
        <p
          class="titulo-pantalla__resumen"
          style={{ marginBlockStart: "calc(var(--e-4) * -1)" }}
        >
          {siapa.resumen(casa, activos, topeTotal)}
        </p>
      ) : null}
      <Boton
        variante="primario"
        ancho
        icono="mas"
        onClick={() => {
          setMensaje("");
          setAbierto({ t: "registrar" });
        }}
      >
        {siapa.registrar}
      </Boton>
      <div
        role="status"
        aria-live="polite"
        class={mensaje ? undefined : "solo-lector"}
      >
        {mensaje ? <Aviso>{mensaje}</Aviso> : null}
      </div>

      {falla ? (
        <>
          <Aviso tono="error">{siapa.noCargo}</Aviso>
          <Boton onClick={() => setVersion((v) => v + 1)}>
            {siapa.reintentar}
          </Boton>
        </>
      ) : folios === null ? (
        <p class="pantalla-vacia">{comun.estados.cargando}</p>
      ) : vigentes.length === 0 ? (
        <p class="pantalla-vacia">{siapa.vacio}</p>
      ) : null}

      {vigentes.length > 0 ? (
        <section class="seccion" aria-labelledby="h-vigentes">
          <h2 id="h-vigentes" class="solo-lector">
            {siapa.listaActivos}
          </h2>
          <ul class="lista">
            {vigentes.map((f) => (
              <li key={f.id}>
                <Tarjeta f={f} todos={lista} abrir={setAbierto} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Aviso>{siapa.avisoPermanente}</Aviso>

      {anteriores.length > 0 ? (
        <details class="seccion">
          <summary class="btn btn--secundario btn--ancho">
            {siapa.anteriores(anteriores.length)}
          </summary>
          <ul class="lista">
            {anteriores.map((f) => (
              <li key={f.id}>
                <Tarjeta f={f} todos={lista} abrir={setAbierto} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {abierto?.t === "registrar" ? (
        <DialogoRegistro onCerrar={cerrar} onHecho={hecho} />
      ) : null}
      {abierto?.t === "reemplazar" ? (
        <DialogoRegistro
          reemplaza={abierto.folio}
          onCerrar={cerrar}
          onHecho={hecho}
        />
      ) : null}
      {abierto?.t === "surtido" ? (
        <DialogoSurtido
          folio={abierto.folio}
          otrosActivos={
            lista.filter(
              (f) => f.estado === "activo" && f.id !== abierto.folio.id,
            ).length
          }
          onCerrar={cerrar}
          onHecho={hecho}
        />
      ) : null}
      {abierto?.t === "pendiente" ? (
        <DialogoPendiente
          folio={abierto.folio}
          onCerrar={cerrar}
          onHecho={hecho}
        />
      ) : null}
    </>
  );
}
