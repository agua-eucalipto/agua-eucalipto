import type { AnotacionVista, ViajeVista } from "../../api";
import {
  Aviso,
  Boton,
  Insignia,
  MarcaFila,
  Nota,
  Tarjeta,
} from "../../componentes";
import { fechaCorta } from "../../app/formato";
import { textos } from "../../textos";
import { textoDeEstado, visualDeEstado } from "./formato";
import { viajePorConfirmar } from "./MiSituacion";
import { MarcasViaje } from "./TarjetaDeViaje";
import type { AccionesPipas } from "./tipos";

const { pipas } = textos;

function MarcasFilaCasa({
  viaje,
  fila,
}: {
  viaje: ViajeVista;
  fila: AnotacionVista;
}) {
  const t = pipas.casas;
  return (
    <>
      {fila.casa_numero === viaje.responsable_casa ? (
        <MarcaFila tono="neutra" icono="tablero" texto={t.coordina} />
      ) : null}
      {fila.con_prioridad && fila.estado === "anotada" ? (
        <MarcaFila tono="prioridad" icono="estrella" texto={t.conPrioridad} />
      ) : null}
      {fila.excede_capacidad ? (
        <MarcaFila tono="alerta" icono="alerta" texto={t.puedeQueNoAlcance} />
      ) : null}
      {fila.estado === "baja_despues_de_pedida" ? (
        <MarcaFila tono="neutra" icono="salida" texto={t.bajaDespuesDePedido} />
      ) : null}
      {fila.estado === "surtio" ? (
        <MarcaFila tono="neutra" icono="check" texto={t.surtio} />
      ) : null}
      {fila.estado === "pendiente" ? (
        <MarcaFila tono="neutra" icono="reloj" texto={t.pendiente} />
      ) : null}
      {fila.sin_confirmar ? (
        <MarcaFila tono="neutra" icono="x-circulo" texto={t.sinConfirmar} />
      ) : null}
      {viaje.estado === "ya_paso" &&
      fila.estado === "anotada" &&
      !fila.sin_confirmar ? (
        <MarcaFila tono="neutra" icono="reloj" texto={t.faltaConfirmar} />
      ) : null}
    </>
  );
}

function ListaCasas({
  viaje,
  casa,
}: {
  viaje: ViajeVista;
  casa: string | null;
}) {
  const filas = viaje.anotaciones;
  const cuentan = filas.filter(
    (f) => f.estado !== "baja_despues_de_pedida",
  ).length;
  let numero = 0;
  return (
    <section class="tarjeta" aria-labelledby="h-casas">
      <h2 id="h-casas" style={{ fontSize: "var(--t-titulo-3)" }}>
        {pipas.secciones.casas(cuentan)}
      </h2>
      <p class="fecha">{pipas.casas.orden}</p>
      <ol class="filas">
        {filas.map((f) => {
          const baja = f.estado === "baja_despues_de_pedida";
          if (!baja) numero += 1;
          const clases = [
            "fila",
            f.excede_capacidad ? "fila--fuera" : "",
            baja ? "fila--baja" : "",
            f.casa_numero === casa ? "fila--tu" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={f.id} class={clases}>
              <span class="fila__num" aria-hidden={baja ? "true" : undefined}>
                {baja ? "–" : numero}
              </span>
              <span class="fila__casa">{pipas.casas.casa(f.casa_numero)}</span>
              <span class="fila__marcas">
                {f.casa_numero === casa ? (
                  <MarcaFila
                    tono="neutra"
                    icono="casa"
                    texto={pipas.casas.tuCasa}
                  />
                ) : null}
                <MarcasFilaCasa viaje={viaje} fila={f} />
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Detalle de un viaje: estado, acciones según el papel de la casa y la lista. */
export function DetalleViaje({
  viaje,
  casa,
  viajes,
  acciones,
  volver,
}: {
  viaje: ViajeVista;
  casa: string | null;
  viajes: ViajeVista[];
  acciones: AccionesPipas;
  volver: () => void;
}) {
  const recibe = viaje.estado === "juntando" || viaje.estado === "lista";
  const resumen = [
    viaje.soy_responsable
      ? pipas.viaje.coordinas
      : pipas.viaje.coordina(viaje.responsable_casa),
    viaje.capacidad_aprox !== null
      ? pipas.viaje.alcanzaPara(viaje.capacidad_aprox)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const fechaEstado =
    viaje.estado === "pedida" && viaje.pedido_at !== null
      ? pipas.viaje.pedidoEl(fechaCorta(viaje.pedido_at))
      : viaje.estado === "ya_paso" && viaje.paso_at !== null
        ? pipas.viaje.pasoEl(fechaCorta(viaje.paso_at))
        : pipas.viaje.abiertoEl(fechaCorta(viaje.abierto_at));
  const faltan = Math.max(0, viaje.minimo_casas - viaje.anotadas);
  const porConfirmar = viajePorConfirmar(viajes, casa)?.id === viaje.id;

  return (
    <>
      <Boton variante="texto" onClick={volver}>
        <span aria-hidden="true">←</span> {pipas.viaje.volver}
      </Boton>
      <div class="titulo-pantalla">
        <h2 id="titulo-vista" tabIndex={-1}>
          {viaje.proveedor}
        </h2>
        <p class="titulo-pantalla__resumen">{resumen}</p>
      </div>
      <div class="dos-columnas">
        <Tarjeta etiqueta={pipas.secciones.estado}>
          <div>
            <Insignia
              estado={visualDeEstado(viaje.estado)}
              texto={textoDeEstado(viaje)}
            />
          </div>
          <p class="tiempo">{fechaEstado}</p>
          {viaje.precio_por_casa !== null ? (
            <p class="fecha">{pipas.viaje.precio(viaje.precio_por_casa)}</p>
          ) : null}
          <MarcasViaje viaje={viaje} />
          {viaje.responsable_inactivo ? (
            <Aviso tono="atencion">{pipas.viaje.inactivo}</Aviso>
          ) : null}
          {viaje.estado === "pedida" ? (
            <Aviso tono="atencion">{pipas.viaje.yaSePidio}</Aviso>
          ) : null}
          {porConfirmar ? (
            <>
              <p class="tiempo">
                {pipas.situacion.preguntaEntrega(viaje.proveedor)}
              </p>
              <div class="acciones acciones--pila">
                <Boton
                  variante="primario"
                  onClick={() => acciones.confirmarEntrega(viaje, "surtio")}
                >
                  {pipas.situacion.siMeSurtio}
                </Boton>
                <Boton
                  variante="secundario"
                  onClick={() => acciones.confirmarEntrega(viaje, "pendiente")}
                >
                  {pipas.situacion.sigoPendiente}
                </Boton>
              </div>
            </>
          ) : null}
          <div class="acciones acciones--pila">
            {viaje.soy_responsable && recibe ? (
              <>
                <Boton
                  variante="primario"
                  deshabilitado={viaje.estado !== "lista"}
                  razon={
                    viaje.estado !== "lista"
                      ? pipas.responsable.faltan(faltan)
                      : undefined
                  }
                  id="ya-llame"
                  onClick={() => acciones.dialogo("pedir", viaje)}
                >
                  {pipas.responsable.yaLlame}
                </Boton>
                <Boton
                  variante="secundario"
                  onClick={() => acciones.editar(viaje)}
                >
                  {pipas.responsable.editar}
                </Boton>
                <Boton
                  variante="texto"
                  onClick={() => acciones.dialogo("cancelar", viaje)}
                >
                  {pipas.responsable.cancelar}
                </Boton>
              </>
            ) : null}
            {viaje.soy_responsable && viaje.estado === "pedida" ? (
              <Boton
                variante="primario"
                onClick={() => acciones.dialogo("yaPaso", viaje)}
              >
                {pipas.responsable.yaPaso}
              </Boton>
            ) : null}
            {!viaje.soy_responsable && recibe && !viaje.estoy_anotado ? (
              <Boton
                variante="primario"
                onClick={() => acciones.anotarse(viaje)}
              >
                {pipas.viaje.anotarme}
              </Boton>
            ) : null}
            {!viaje.soy_responsable &&
            viaje.estoy_anotado &&
            (recibe || viaje.estado === "pedida") ? (
              <Boton
                variante="secundario"
                onClick={() => acciones.dialogo("baja", viaje)}
              >
                {pipas.situacion.darmeDeBaja}
              </Boton>
            ) : null}
            {!viaje.soy_responsable &&
            viaje.estoy_anotado &&
            viaje.responsable_inactivo ? (
              <Boton
                variante="primario"
                onClick={() => acciones.dialogo("tomar", viaje)}
              >
                {pipas.viaje.tomarResponsabilidad}
              </Boton>
            ) : null}
            {viaje.estado === "pedida" && !viaje.estoy_anotado ? (
              <Boton variante="primario" icono="mas" onClick={acciones.nuevo}>
                {pipas.viaje.abrirSiguiente}
              </Boton>
            ) : null}
          </div>
          {viaje.soy_responsable && recibe ? (
            <Nota icono="info">{pipas.viaje.sinSalirResponsable}</Nota>
          ) : null}
        </Tarjeta>
        <ListaCasas viaje={viaje} casa={casa} />
      </div>
    </>
  );
}
