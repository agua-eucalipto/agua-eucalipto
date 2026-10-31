import { useState } from "preact/hooks";
import type { ViajeVista } from "../../api";
import { Aviso, Boton, CampoGrande, Casilla, Dialogo } from "../../componentes";
import { textos } from "../../textos";
import type { TipoDialogo } from "./tipos";

const { pipas } = textos;

interface PropsDialogos {
  tipo: TipoDialogo;
  viaje: ViajeVista;
  error: string | null;
  enviando: boolean;
  cerrar: () => void;
  baja: () => void;
  pedir: (eta: string) => void;
  yaPaso: () => void;
  cancelar: () => void;
  tomar: (acepta: boolean) => void;
}

function Pie({
  si,
  alConfirmar,
  cerrar,
  deshabilitado,
  razon,
  error,
}: {
  si: string;
  alConfirmar: () => void;
  cerrar: () => void;
  deshabilitado?: boolean;
  razon?: string;
  error: string | null;
}) {
  return (
    <>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <div class="acciones acciones--pila">
        <Boton
          variante="primario"
          focoInicial
          id="dialogo-si"
          deshabilitado={deshabilitado}
          razon={razon}
          onClick={alConfirmar}
        >
          {si}
        </Boton>
        <Boton variante="secundario" onClick={cerrar}>
          {pipas.dialogos.noRegresar}
        </Boton>
      </div>
    </>
  );
}

function ContenidoPedir({
  error,
  alConfirmar,
  cerrar,
}: {
  error: string | null;
  alConfirmar: (eta: string) => void;
  cerrar: () => void;
}) {
  const d = pipas.dialogos.pedir;
  const [elegida, setElegida] = useState<string | null>(null);
  const [otro, setOtro] = useState("");
  const eta = elegida === "otro" ? otro.trim() : (elegida ?? "");
  return (
    <>
      <div
        role="group"
        aria-label={d.grupo}
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--e-2)" }}
      >
        {d.opciones.map((o) => (
          <button
            key={o.eta}
            type="button"
            class={
              elegida === o.eta ? "btn btn--primario" : "btn btn--secundario"
            }
            aria-pressed={elegida === o.eta}
            onClick={() => setElegida(o.eta)}
          >
            {o.etiqueta}
          </button>
        ))}
        <button
          type="button"
          class={
            elegida === "otro" ? "btn btn--primario" : "btn btn--secundario"
          }
          aria-pressed={elegida === "otro"}
          onClick={() => setElegida("otro")}
        >
          {d.otro}
        </button>
      </div>
      {elegida === "otro" ? (
        <CampoGrande
          id="pedir-otro"
          etiqueta={d.otroEtiqueta}
          ayuda={d.otroEjemplo}
          valor={otro}
          onInput={setOtro}
        />
      ) : null}
      <Pie
        si={d.si}
        alConfirmar={() => alConfirmar(eta)}
        cerrar={cerrar}
        deshabilitado={eta === ""}
        razon={eta === "" ? d.elige : undefined}
        error={error}
      />
    </>
  );
}

function ContenidoTomar({
  error,
  alConfirmar,
  cerrar,
}: {
  error: string | null;
  alConfirmar: (acepta: boolean) => void;
  cerrar: () => void;
}) {
  const [acepta, setAcepta] = useState(false);
  return (
    <>
      <p>{pipas.disclaimerResponsable.texto}</p>
      <Casilla id="tomar-acepta" marcada={acepta} onCambio={setAcepta}>
        {pipas.disclaimerResponsable.casilla}
      </Casilla>
      <Pie
        si={pipas.dialogos.tomar.si}
        alConfirmar={() => alConfirmar(acepta)}
        cerrar={cerrar}
        error={error}
      />
    </>
  );
}

/** Los cinco diálogos de confirmación de la pantalla de pipas. */
export function DialogoPipas(p: PropsDialogos) {
  const d = pipas.dialogos;
  switch (p.tipo) {
    case "baja":
      return (
        <Dialogo
          titulo={d.baja.titulo(p.viaje.proveedor)}
          descripcion={
            p.viaje.estado === "pedida"
              ? d.baja.descripcionPedida
              : d.baja.descripcion
          }
          onCerrar={p.cerrar}
        >
          <Pie
            si={d.baja.si}
            alConfirmar={p.baja}
            cerrar={p.cerrar}
            error={p.error}
          />
        </Dialogo>
      );
    case "pedir":
      return (
        <Dialogo
          titulo={d.pedir.titulo}
          descripcion={d.pedir.descripcion}
          onCerrar={p.cerrar}
        >
          <ContenidoPedir
            error={p.error}
            alConfirmar={p.pedir}
            cerrar={p.cerrar}
          />
        </Dialogo>
      );
    case "yaPaso":
      return (
        <Dialogo
          titulo={d.yaPaso.titulo}
          descripcion={d.yaPaso.descripcion}
          onCerrar={p.cerrar}
        >
          <Pie
            si={d.yaPaso.si}
            alConfirmar={p.yaPaso}
            cerrar={p.cerrar}
            error={p.error}
          />
        </Dialogo>
      );
    case "cancelar":
      return (
        <Dialogo
          titulo={d.cancelar.titulo}
          descripcion={d.cancelar.descripcion}
          onCerrar={p.cerrar}
        >
          <Pie
            si={d.cancelar.si}
            alConfirmar={p.cancelar}
            cerrar={p.cerrar}
            error={p.error}
          />
        </Dialogo>
      );
    case "tomar":
      return (
        <Dialogo titulo={d.tomar.titulo} onCerrar={p.cerrar}>
          <ContenidoTomar
            error={p.error}
            alConfirmar={p.tomar}
            cerrar={p.cerrar}
          />
        </Dialogo>
      );
  }
}
