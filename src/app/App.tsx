import { lazy, Suspense } from "preact/compat";
import { useEffect } from "preact/hooks";
import { Aviso, PantallaVacia, TituloPantalla } from "../componentes";
import { textos } from "../textos";
import { BarraDemo } from "./BarraDemo";
import { Encabezado } from "./Encabezado";
import { Navegacion } from "./Pestanas";
import { iniciarNavegacion, rutaActual, type Ruta } from "./ruta";
import { refrescarSesion, sesion, verComo } from "./servicios";

const { comun } = textos;

const PANTALLAS: Record<
  Exclude<Ruta, "sistema">,
  { titulo: string; vacia: string }
> = {
  siapa: { titulo: comun.titulos.siapa, vacia: comun.vacias.siapa },
  pipas: { titulo: comun.titulos.pipas, vacia: comun.vacias.pipas },
  coordinador: {
    titulo: comun.titulos.coordinador,
    vacia: comun.vacias.coordinador,
  },
  info: { titulo: comun.titulos.informacion, vacia: comun.vacias.informacion },
};

const Sistema = import.meta.env.DEV ? lazy(() => import("./Sistema")) : null;

function Pantalla() {
  const ruta = rutaActual.value;
  if (ruta === "sistema" && Sistema) {
    return (
      <main class="contenido" id="contenido">
        <TituloPantalla id="titulo-pantalla" titulo="Catálogo de componentes" />
        <Suspense fallback={null}>
          <Sistema />
        </Suspense>
      </main>
    );
  }
  const info = ruta && ruta !== "sistema" ? PANTALLAS[ruta] : null;
  const titulo = info?.titulo ?? comun.titulos.noEncontrada;

  useEffect(() => {
    document.title = `${titulo} · ${comun.marca.nombre}`;
    const h1 = document.getElementById("titulo-pantalla");
    h1?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [ruta, titulo]);

  const sinPermiso =
    ruta === "coordinador" && sesion.value.rol !== "coordinador";

  return (
    <main class="contenido" id="contenido">
      <TituloPantalla id="titulo-pantalla" titulo={titulo} />
      {sinPermiso ? (
        <Aviso tono="atencion">{comun.noAutorizado}</Aviso>
      ) : (
        <PantallaVacia>
          {info?.vacia ?? comun.vacias.noEncontrada}
        </PantallaVacia>
      )}
    </main>
  );
}

export function App() {
  useEffect(() => {
    const detener = iniciarNavegacion();
    void (async () => {
      await refrescarSesion();
      // Sin pantalla de acceso todavía: el demo arranca como vecino de la casa 7.
      if (sesion.value.rol === "sin_sesion") await verComo("vecino", "7");
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
    </>
  );
}
