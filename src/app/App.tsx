import type { ComponentType } from "preact";
import { lazy, Suspense } from "preact/compat";
import { useEffect } from "preact/hooks";
import { Aviso, PantallaVacia, TituloPantalla } from "../componentes";
import { PrimeraVez } from "../pantallas/acceso";
import { PantallaCoordinador } from "../pantallas/coordinador";
import { PantallaInfo } from "../pantallas/info";
import { PantallaPipas } from "../pantallas/pipas";
import { PantallaSiapa } from "../pantallas/siapa";
import { textos } from "../textos";
import { BarraDemo } from "./BarraDemo";
import { Encabezado } from "./Encabezado";
import { Navegacion } from "./Pestanas";
import { iniciarNavegacion, rutaActual, type Ruta } from "./ruta";
import { arrancarSesionDemo, sesion } from "./servicios";
import { resumenTitulo } from "./titulo";

const { comun } = textos;

const PANTALLAS: Record<
  Exclude<Ruta, "sistema">,
  { titulo: string; Componente: ComponentType }
> = {
  siapa: { titulo: comun.titulos.siapa, Componente: PantallaSiapa },
  pipas: { titulo: comun.titulos.pipas, Componente: PantallaPipas },
  coordinador: {
    titulo: comun.titulos.coordinador,
    Componente: PantallaCoordinador,
  },
  info: { titulo: comun.titulos.informacion, Componente: PantallaInfo },
};

const Sistema = import.meta.env.DEV ? lazy(() => import("./Sistema")) : null;

function Pantalla() {
  const ruta = rutaActual.value;
  const enCatalogo = ruta === "sistema" && Sistema !== null;
  const info = ruta && ruta !== "sistema" ? PANTALLAS[ruta] : null;
  const titulo = enCatalogo
    ? "Catálogo de componentes"
    : (info?.titulo ?? comun.titulos.noEncontrada);

  useEffect(() => {
    document.title = `${titulo} · ${comun.marca.nombre}`;
    const h1 = document.getElementById("titulo-pantalla");
    h1?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [ruta, titulo]);

  if (enCatalogo && Sistema) {
    return (
      <main class="contenido" id="contenido">
        <TituloPantalla id="titulo-pantalla" titulo={titulo} />
        <Suspense fallback={null}>
          <Sistema />
        </Suspense>
      </main>
    );
  }

  const sinPermiso =
    ruta === "coordinador" && sesion.value.rol !== "coordinador";

  return (
    <main class="contenido" id="contenido">
      <TituloPantalla
        id="titulo-pantalla"
        titulo={titulo}
        resumen={ruta === "siapa" ? resumenTitulo.value : undefined}
      />
      {sinPermiso ? (
        <Aviso tono="atencion">{comun.noAutorizado}</Aviso>
      ) : info ? (
        <info.Componente />
      ) : (
        <PantallaVacia>{comun.vacias.noEncontrada}</PantallaVacia>
      )}
    </main>
  );
}

export function App() {
  useEffect(() => {
    const detener = iniciarNavegacion();
    void (async () => {
      await arrancarSesionDemo();
    })();
    return detener;
  }, []);

  return (
    <>
      <a
        class="saltar"
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("titulo-pantalla")?.focus();
        }}
      >
        {comun.saltarAlContenido}
      </a>
      <BarraDemo />
      <Encabezado />
      <Pantalla />
      <Navegacion variante="movil" />
      <PrimeraVez />
    </>
  );
}
