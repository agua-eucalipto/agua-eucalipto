import { useEffect, useState } from "preact/hooks";
import { CATALOGO_DEMO } from "../api/memoria";
import { Boton, Dialogo, Icono } from "../componentes";
import { textos } from "../textos";
import { fechaCorta } from "./formato";
import { irAInicio } from "./ruta";
import {
  adelantarUnDia,
  diasAdelantados,
  fijarAljibe,
  mostrarAljibe,
  refrescarSesion,
  reiniciarDemo,
  reloj,
  sesion,
  verComo,
} from "./servicios";

const { demo } = textos.comun;

type Perfil = "vecino" | "coordinador" | "otra_calle";

function perfilActual(): Perfil {
  const { rol, casa } = sesion.value;
  if (rol === "coordinador") return "coordinador";
  if (rol === "vecino" || casa !== null) return "vecino";
  return "otra_calle";
}

/**
 * Barra del demo: fija arriba, azul cielo. Las acciones llaman a `ApiDemo`
 * (contrato); aquí no hay reglas. En pantallas chicas se pliega en "Demo ▾".
 */
export function BarraDemo() {
  const [abierta, setAbierta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState("");
  /** La casa sale de la sesión; "7" solo es la sugerida al pasar a vecino. */
  const casa = sesion.value.casa ?? "7";
  const dias = diasAdelantados();
  const perfil = perfilActual();
  const aljibeActivo = mostrarAljibe.value;

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(""), 5000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const cambiarPerfil = async (p: Perfil, c?: string) => {
    const r = await verComo(p, c);
    if (!r.ok) setAviso(demo.fallo);
  };

  const adelantar = async () => {
    const r = await adelantarUnDia();
    if (!r.ok) {
      setAviso(demo.fallo);
      return;
    }
    await refrescarSesion();
    setAviso(demo.adelantado(fechaCorta(r.datos.ahora), diasAdelantados()));
  };

  const reiniciar = async () => {
    setConfirmando(false);
    const r = await reiniciarDemo();
    setAviso(r.ok ? "" : demo.fallo);
    // Lista para el siguiente visitante: pantalla inicial, no la que se dejó.
    if (r.ok) irAInicio();
  };

  return (
    <div
      class={abierta ? "barra-demo barra-demo--abierta" : "barra-demo"}
      role="region"
      aria-label={demo.region}
    >
      <div class="barra-demo__dentro">
        <div class="barra-demo__estado">
          <p class="barra-demo__marca">
            <strong>{demo.etiqueta}</strong> · {demo.sufijo}
          </p>
          <p class="barra-demo__dia">
            {demo.dia(dias)} · {fechaCorta(reloj.value)}
          </p>
        </div>
        <button
          class="btn-demo barra-demo__plegada"
          type="button"
          aria-expanded={abierta}
          aria-controls="controles-demo"
          onClick={() => setAbierta(!abierta)}
        >
          {demo.plegar}
          <Icono nombre="abajo" chico />
        </button>
        <div class="barra-demo__controles" id="controles-demo">
          <div class="barra-demo__fila">
            <div
              class="barra-demo__ver-como"
              role="group"
              aria-label={demo.verComo}
            >
              <div class="barra-demo__opciones">
                <button
                  class="btn-demo"
                  type="button"
                  aria-pressed={perfil === "vecino"}
                  onClick={() => cambiarPerfil("vecino", casa)}
                >
                  {demo.vecino}
                </button>
                <button
                  class="btn-demo"
                  type="button"
                  aria-pressed={perfil === "coordinador"}
                  onClick={() => cambiarPerfil("coordinador")}
                >
                  {demo.coordinador}
                </button>
                <button
                  class="btn-demo"
                  type="button"
                  aria-pressed={perfil === "otra_calle"}
                  onClick={() => cambiarPerfil("otra_calle")}
                >
                  {demo.otraCalle}
                </button>
              </div>
              {perfil === "vecino" ? (
                <label class="barra-demo__casa">
                  {demo.casa}
                  <select
                    value={casa}
                    onChange={(e) => {
                      const c = (e.currentTarget as HTMLSelectElement).value;
                      void cambiarPerfil("vecino", c);
                    }}
                  >
                    {CATALOGO_DEMO.casas.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <button class="btn-demo" type="button" onClick={adelantar}>
              {demo.adelantar}
            </button>
            <button
              class="btn-demo"
              type="button"
              onClick={() => setConfirmando(true)}
            >
              {demo.reiniciar}
            </button>
          </div>
          <label class="barra-demo__aljibe">
            <input
              type="checkbox"
              checked={aljibeActivo}
              onChange={(e) => {
                void fijarAljibe((e.currentTarget as HTMLInputElement).checked);
              }}
            />
            <span>{demo.aljibe}</span>
          </label>
        </div>
        <p
          class="barra-demo__aviso"
          role="status"
          aria-live="polite"
          hidden={!aviso}
        >
          {aviso}
        </p>
      </div>
      {confirmando ? (
        <Dialogo
          titulo={demo.tituloReiniciar}
          descripcion={demo.confirmarReinicio}
          onCerrar={() => setConfirmando(false)}
        >
          <div class="acciones acciones--pila">
            <Boton variante="primario" ancho focoInicial onClick={reiniciar}>
              {demo.siReiniciar}
            </Boton>
            <Boton
              variante="secundario"
              ancho
              onClick={() => setConfirmando(false)}
            >
              {demo.noRegresar}
            </Boton>
          </div>
        </Dialogo>
      ) : null}
    </div>
  );
}
