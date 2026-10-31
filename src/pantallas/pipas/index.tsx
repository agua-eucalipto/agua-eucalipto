import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Resultado, ResultadoEntrega, ViajeVista } from "../../api";
import { api, reloj, sesion } from "../../app/servicios";
import { Aviso, Boton } from "../../componentes";
import { textos } from "../../textos";
import { usarDatosPipas } from "./datos";
import { DetalleViaje } from "./DetalleViaje";
import { DialogoPipas } from "./Dialogos";
import { textoDeError } from "./errores";
import { ListaEspera } from "./Espera";
import { DOS_COLUMNAS, esActivo } from "./formato";
import {
  datosParaAbrir,
  FormularioViaje,
  type DatosFormulario,
} from "./FormularioViaje";
import { MiSituacion } from "./MiSituacion";
import { TarjetaDeViaje } from "./TarjetaDeViaje";
import type { AccionesPipas, TipoDialogo } from "./tipos";

const { pipas } = textos;

type Vista =
  | { tipo: "lista" }
  | { tipo: "detalle"; id: string }
  | { tipo: "abrir" }
  | { tipo: "editar"; id: string };

interface AvisoPantalla {
  tono: "info" | "error";
  texto: string;
}

/**
 * Pantalla de Pipas privadas. Muestra lo que devuelve la `Api` (viajes, espera
 * y sus banderas) y le manda las acciones; ninguna regla vive aquí. El detalle
 * de un viaje y el formulario son vistas internas: la ruta sigue siendo `#pipas`.
 */
export function PantallaPipas() {
  const ahora = reloj.value;
  const { rol, casa } = sesion.value;
  const { carga, recargar } = usarDatosPipas();
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [dialogo, setDialogo] = useState<{
    tipo: TipoDialogo;
    id: string;
  } | null>(null);
  const [aviso, setAviso] = useState<AvisoPantalla | null>(null);
  const [errorDialogo, setErrorDialogo] = useState<string | null>(null);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);
  const avisoRef = useRef<HTMLDivElement>(null);
  const primeraVista = useRef(true);

  // Otra casa u otro rol: se empieza de cero.
  useEffect(() => {
    setVista({ tipo: "lista" });
    setDialogo(null);
    setAviso(null);
    setErrorDialogo(null);
    setErrorFormulario(null);
  }, [rol, casa]);

  // Al cambiar de vista, el foco va al título de esa vista.
  const claveVista = vista.tipo === "lista" ? "lista" : `${vista.tipo}`;
  useEffect(() => {
    if (primeraVista.current) {
      primeraVista.current = false;
      return;
    }
    const destino =
      vista.tipo === "lista"
        ? document.getElementById("titulo-pantalla")
        : document.getElementById("titulo-vista");
    destino?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [claveVista, "id" in vista ? vista.id : ""]);

  useEffect(() => {
    if (aviso) avisoRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [aviso]);

  const datos = carga.estado === "listo" ? carga.datos : null;
  const viajeDe = (id: string): ViajeVista | undefined =>
    datos?.viajes.find((v) => v.id === id);

  /**
   * Corre una acción de la `Api`. Un rechazo de regla se muestra con el texto
   * de 07 (en el diálogo o formulario si están abiertos) y se vuelve a leer,
   * porque casi siempre significa que lo que se veía ya cambió.
   */
  async function correr<T>(
    llamada: () => Promise<Resultado<T>>,
    alExito: (datos: T) => string | null,
    dondeError: "pantalla" | "dialogo" | "formulario" = "pantalla",
  ): Promise<boolean> {
    if (enCurso.current) return false;
    enCurso.current = true;
    setEnviando(true);
    try {
      const r = await llamada();
      if (r.ok) {
        const texto = alExito(r.datos);
        setAviso(texto ? { tono: "info", texto } : null);
        setErrorDialogo(null);
        setErrorFormulario(null);
        await recargar();
        return true;
      }
      const texto = textoDeError(r.error);
      if (dondeError === "dialogo") setErrorDialogo(texto);
      else if (dondeError === "formulario") setErrorFormulario(texto);
      else setAviso({ tono: "error", texto });
      await recargar();
      return false;
    } catch {
      setAviso({ tono: "error", texto: pipas.errores.inesperado });
      return false;
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }

  function cerrarDialogo() {
    setDialogo(null);
    setErrorDialogo(null);
  }

  async function desdeDialogo<T>(
    llamada: () => Promise<Resultado<T>>,
    alExito: (datos: T) => string | null,
    despues?: () => void,
  ) {
    const bien = await correr(llamada, alExito, "dialogo");
    if (bien) {
      cerrarDialogo();
      despues?.();
    }
  }

  const acciones: AccionesPipas = {
    ver: (id) => {
      setAviso(null);
      setVista({ tipo: "detalle", id });
    },
    anotarse: (v) =>
      void correr(
        () => api.anotarse(v.id),
        () => pipas.exito.anotado(v.proveedor),
      ),
    meDaIgual: () =>
      void correr(
        () => api.anotarse_cualquiera(),
        (r) =>
          r.viaje
            ? pipas.exito.meDaIgualViaje(r.viaje.proveedor)
            : pipas.exito.meDaIgualEspera,
      ),
    nuevo: () => {
      setAviso(null);
      setErrorFormulario(null);
      setVista({ tipo: "abrir" });
    },
    editar: (v) => {
      setAviso(null);
      setErrorFormulario(null);
      setVista({ tipo: "editar", id: v.id });
    },
    salirDeEspera: () =>
      void correr(
        () => api.salir_de_espera(),
        () => pipas.exito.saliste,
      ),
    confirmarEntrega: (v, resultado: ResultadoEntrega) =>
      void correr(
        () => api.confirmar_entrega(v.id, resultado),
        () =>
          resultado === "surtio" ? pipas.exito.surtio : pipas.exito.pendiente,
      ),
    dialogo: (tipo, v) => {
      setErrorDialogo(null);
      setDialogo({ tipo, id: v.id });
    },
  };

  function enviarFormulario(
    d: DatosFormulario,
    editando: ViajeVista | undefined,
  ) {
    if (editando) {
      void correr(
        () =>
          api.editar_viaje(editando.id, {
            proveedor: d.proveedor,
            precio_por_casa: d.precio_por_casa ?? null,
            minimo_casas: d.minimo_casas,
            capacidad_aprox: d.capacidad_aprox ?? null,
          }),
        () => {
          setVista({ tipo: "detalle", id: editando.id });
          return pipas.exito.editado;
        },
        "formulario",
      );
      return;
    }
    void correr(
      () => api.abrir_viaje(datosParaAbrir(d)),
      (v) => {
        setVista({ tipo: "detalle", id: v.id });
        const sumadas = v.anotadas - 1;
        return sumadas > 0
          ? `${pipas.exito.abierto} ${pipas.exito.sumadas(sumadas)}.`
          : pipas.exito.abierto;
      },
      "formulario",
    );
  }

  const viajeDialogo = dialogo ? viajeDe(dialogo.id) : undefined;
  const dialogoAbierto =
    dialogo && viajeDialogo ? (
      <DialogoPipas
        tipo={dialogo.tipo}
        viaje={viajeDialogo}
        error={errorDialogo}
        cerrar={cerrarDialogo}
        baja={() =>
          void desdeDialogo(
            () => api.dar_de_baja(viajeDialogo.id),
            () => pipas.exito.baja(viajeDialogo.proveedor),
          )
        }
        pedir={(eta) =>
          void desdeDialogo(
            () => api.marcar_pedida(viajeDialogo.id, eta),
            () => pipas.exito.pedida,
          )
        }
        yaPaso={() =>
          void desdeDialogo(
            () => api.marcar_ya_paso(viajeDialogo.id),
            () => pipas.exito.yaPaso,
          )
        }
        cancelar={() =>
          void desdeDialogo(
            async () => api.cancelar_viaje(viajeDialogo.id),
            () => pipas.exito.cancelado,
            () => setVista({ tipo: "lista" }),
          )
        }
        tomar={(acepta) =>
          void desdeDialogo(
            () => api.tomar_responsabilidad(viajeDialogo.id, acepta as true),
            () => pipas.exito.tomada,
          )
        }
      />
    ) : null;

  const ordenados = useMemo(() => {
    if (!datos) return { abiertos: [], pasaron: [] };
    const abiertos = datos.viajes.filter(esActivo);
    // Los que todavía reciben casas van antes que los ya pedidos.
    const recibe = (v: ViajeVista) => (v.estado === "pedida" ? 1 : 0);
    return {
      abiertos: [...abiertos].sort((a, b) => recibe(a) - recibe(b)),
      pasaron: datos.viajes.filter((v) => !esActivo(v)),
    };
  }, [datos]);

  let cuerpo;
  if (carga.estado === "cargando") {
    cuerpo = <p class="fecha">{pipas.cargando}</p>;
  } else if (carga.estado === "error" || !datos) {
    cuerpo = (
      <>
        <Aviso tono="error">{pipas.noSePudoCargar}</Aviso>
        <Boton variante="secundario" onClick={() => void recargar()}>
          {pipas.reintentar}
        </Boton>
      </>
    );
  } else if (vista.tipo === "abrir") {
    cuerpo = (
      <FormularioViaje
        error={errorFormulario}
        enviando={enviando}
        alEnviar={(d) => enviarFormulario(d, undefined)}
        volver={() => setVista({ tipo: "lista" })}
      />
    );
  } else if (vista.tipo === "editar" && viajeDe(vista.id)) {
    const viaje = viajeDe(vista.id)!;
    cuerpo = (
      <FormularioViaje
        viaje={viaje}
        error={errorFormulario}
        enviando={enviando}
        alEnviar={(d) => enviarFormulario(d, viaje)}
        volver={() => setVista({ tipo: "detalle", id: viaje.id })}
      />
    );
  } else if (vista.tipo === "detalle" && viajeDe(vista.id)) {
    cuerpo = (
      <DetalleViaje
        viaje={viajeDe(vista.id)!}
        casa={datos.casa}
        viajes={datos.viajes}
        acciones={acciones}
        volver={() => setVista({ tipo: "lista" })}
      />
    );
  } else {
    cuerpo = (
      <>
        <MiSituacion datos={datos} ahora={ahora} acciones={acciones} />
        <div class="dos-columnas" style={DOS_COLUMNAS}>
          <section class="seccion" aria-labelledby="h-viajes">
            <h2 id="h-viajes" tabIndex={-1}>
              {pipas.secciones.abiertos}
            </h2>
            {ordenados.abiertos.length === 0 ? (
              <p>{pipas.vacios.viajes}</p>
            ) : (
              <ul class="lista">
                {ordenados.abiertos.map((v) => (
                  <li key={v.id}>
                    <TarjetaDeViaje viaje={v} acciones={acciones} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div class="seccion">
            {ordenados.pasaron.length > 0 ? (
              <section class="seccion" aria-labelledby="h-pasaron">
                <h2 id="h-pasaron">{pipas.secciones.pasaron}</h2>
                <ul class="lista">
                  {ordenados.pasaron.map((v) => (
                    <li key={v.id}>
                      <TarjetaDeViaje viaje={v} acciones={acciones} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <ListaEspera
              espera={datos.espera}
              casa={datos.casa}
              ahora={ahora}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Aviso>{pipas.disclaimer}</Aviso>
      <div ref={avisoRef} aria-live="polite">
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      </div>
      {cuerpo}
      {dialogoAbierto}
    </>
  );
}
