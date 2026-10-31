import { Icono } from "../componentes";
import { textos } from "../textos";
import { Navegacion } from "./Pestanas";
import { rutaActual } from "./ruta";
import { sesion } from "./servicios";

const { comun } = textos;

export function Encabezado() {
  const esCoordinador = sesion.value.rol === "coordinador";
  const ruta = rutaActual.value;
  return (
    <header class="encabezado">
      <div class="encabezado__dentro">
        <a class="marca" href="#siapa" aria-label={comun.marca.nombre}>
          <span class="marca__nombre">{comun.marca.nombre}</span>
          <span class="marca__sub">{comun.marca.subtitulo}</span>
        </a>
        <Navegacion variante="escritorio" />
        {esCoordinador ? (
          <a
            class="btn btn--secundario btn-coord"
            href="#coordinador"
            aria-label={comun.navegacion.coordinador}
            aria-current={ruta === "coordinador" ? "page" : undefined}
          >
            <Icono nombre="tablero" />
            <span class="btn-coord__texto">{comun.navegacion.coordinador}</span>
          </a>
        ) : null}
        <a
          class="btn-icono"
          href="#info"
          aria-label={comun.navegacion.informacion}
          aria-current={ruta === "info" ? "page" : undefined}
        >
          <Icono nombre="info" />
        </a>
      </div>
    </header>
  );
}
