import type { ViajeVista } from "../../api";
import { Acciones, Boton, Icono, Nota } from "../../componentes";
import { textos } from "../../textos";
import type { DatosPipas } from "./datos";
import { antiguedadTexto, esActivo, lugarDe } from "./formato";
import type { AccionesPipas } from "./tipos";

const { pipas } = textos;

/** El viaje que ya pasó y donde esta casa todavía no ha dicho si le surtieron. */
export function viajePorConfirmar(
  viajes: ViajeVista[],
  casa: string | null,
): ViajeVista | undefined {
  return viajes.find(
    (v) =>
      v.estado === "ya_paso" &&
      v.anotaciones.some(
        (a) =>
          a.casa_numero === casa && a.estado === "anotada" && !a.sin_confirmar,
      ),
  );
}

/**
 * Tarjeta superior. Muestra un solo caso a la vez, en este orden: confirmar
 * una entrega, estar en un viaje, estar en espera, no estar en nada.
 */
export function MiSituacion({
  datos,
  ahora,
  acciones,
}: {
  datos: DatosPipas;
  ahora: number;
  acciones: AccionesPipas;
}) {
  const { casa, viajes, espera } = datos;
  const porConfirmar = viajePorConfirmar(viajes, casa);
  const enViaje = viajes.find((v) => esActivo(v) && v.estoy_anotado);
  const enEspera = espera.find((e) => e.casa_numero === casa);

  let contenido;
  if (porConfirmar) {
    contenido = (
      <>
        <p class="tiempo">
          {pipas.situacion.preguntaEntrega(porConfirmar.proveedor)}
        </p>
        <Acciones pila>
          <Boton
            variante="primario"
            onClick={() => acciones.confirmarEntrega(porConfirmar, "surtio")}
          >
            {pipas.situacion.siMeSurtio}
          </Boton>
          <Boton
            variante="secundario"
            onClick={() => acciones.confirmarEntrega(porConfirmar, "pendiente")}
          >
            {pipas.situacion.sigoPendiente}
          </Boton>
        </Acciones>
      </>
    );
  } else if (enViaje) {
    const lugar = lugarDe(enViaje, casa);
    const texto = enViaje.soy_responsable
      ? pipas.situacion.coordinas(enViaje.proveedor, lugar, enViaje.anotadas)
      : pipas.situacion.enViaje(enViaje.proveedor, lugar, enViaje.anotadas);
    contenido = (
      <>
        <p class="tiempo">{texto}</p>
        <Acciones pila>
          {enViaje.soy_responsable ? (
            <Boton
              variante="secundario"
              onClick={() => acciones.ver(enViaje.id)}
            >
              {pipas.situacion.verViaje}
            </Boton>
          ) : (
            <Boton
              variante="secundario"
              onClick={() => acciones.dialogo("baja", enViaje)}
            >
              {pipas.situacion.darmeDeBaja}
            </Boton>
          )}
        </Acciones>
      </>
    );
  } else if (enEspera) {
    contenido = (
      <>
        <p class="tiempo">{pipas.situacion.enEspera}</p>
        <p class="fecha">
          {pipas.situacion.enEsperaDetalle(
            pipas.espera.desde(
              antiguedadTexto(enEspera.antiguedad_desde, ahora),
            ),
            enEspera.con_prioridad,
          )}
        </p>
        <Nota icono="reloj">{pipas.situacion.seguiremos}</Nota>
        <Acciones pila>
          <Boton variante="secundario" onClick={acciones.salirDeEspera}>
            {pipas.situacion.salirEspera}
          </Boton>
        </Acciones>
      </>
    );
  } else {
    contenido = (
      <>
        <p class="tiempo">{pipas.situacion.nada}</p>
        <Acciones pila>
          <Boton variante="primario" onClick={irAViajes}>
            {pipas.situacion.anotarme}
          </Boton>
          <Boton variante="secundario" onClick={acciones.meDaIgual}>
            {pipas.situacion.meDaIgual}
          </Boton>
          <Boton variante="texto" onClick={acciones.nuevo}>
            <Icono nombre="mas" chico />
            {pipas.situacion.abrir}
          </Boton>
        </Acciones>
      </>
    );
  }

  return (
    <section class="tarjeta" aria-labelledby="h-situacion">
      <h2 id="h-situacion" style={{ fontSize: "var(--t-titulo-3)" }}>
        {pipas.situacion.titulo}
      </h2>
      {contenido}
    </section>
  );
}

/** "Anotarme a un viaje" baja a la lista sin tocar la ruta (`#pipas`). */
function irAViajes() {
  const lista = document.getElementById("h-viajes");
  lista?.scrollIntoView?.({ block: "start" });
  lista?.focus?.({ preventScroll: true });
}
