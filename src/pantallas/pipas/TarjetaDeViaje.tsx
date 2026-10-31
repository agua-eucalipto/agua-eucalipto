import type { ViajeVista } from "../../api";
import {
  AvanceViaje,
  Boton,
  Icono,
  Insignia,
  MarcaFila,
  Nota,
  TarjetaViaje,
} from "../../componentes";
import { fechaCorta } from "../../app/formato";
import { textos } from "../../textos";
import { textoDeEstado, visualDeEstado } from "./formato";
import type { AccionesPipas } from "./tipos";

const { pipas } = textos;

export function MarcasViaje({ viaje }: { viaje: ViajeVista }) {
  return (
    <>
      {viaje.soy_responsable ? (
        <MarcaFila
          tono="neutra"
          icono="tablero"
          texto={pipas.viaje.coordinas}
        />
      ) : null}
      {viaje.estoy_anotado ? (
        <MarcaFila
          tono="neutra"
          icono="check"
          texto={pipas.viaje.yaEstasAqui}
        />
      ) : null}
      {viaje.puede_que_no_alcance ? (
        <MarcaFila
          tono="alerta"
          icono="alerta"
          texto={pipas.viaje.puedeQueNoAlcance}
        />
      ) : null}
    </>
  );
}

/** Tarjeta de un viaje en la lista. Una acción principal y "Ver casas". */
export function TarjetaDeViaje({
  viaje,
  acciones,
}: {
  viaje: ViajeVista;
  acciones: AccionesPipas;
}) {
  const recibe = viaje.estado === "juntando" || viaje.estado === "lista";
  const detalles: string[] = [];
  if (viaje.precio_por_casa !== null) {
    detalles.push(pipas.viaje.precio(viaje.precio_por_casa));
  }
  if (viaje.estado === "ya_paso" && viaje.paso_at !== null) {
    detalles.push(pipas.viaje.pasoEl(fechaCorta(viaje.paso_at)));
  }
  if (!viaje.soy_responsable) {
    detalles.push(
      viaje.estado === "ya_paso"
        ? pipas.viaje.coordinoCasa(viaje.responsable_casa)
        : pipas.viaje.coordina(viaje.responsable_casa),
    );
  }
  if (viaje.capacidad_aprox !== null && viaje.estado !== "ya_paso") {
    detalles.push(pipas.viaje.alcanzaPara(viaje.capacidad_aprox));
  }

  return (
    <TarjetaViaje
      proveedor={viaje.proveedor}
      insignia={
        <Insignia
          estado={visualDeEstado(viaje.estado)}
          texto={textoDeEstado(viaje)}
        />
      }
      avance={
        recibe ? (
          <AvanceViaje anotadas={viaje.anotadas} minimo={viaje.minimo_casas} />
        ) : undefined
      }
      detalles={detalles}
      marcas={
        <>
          <MarcasViaje viaje={viaje} />
          {viaje.responsable_inactivo ? (
            <Nota icono="reloj">{pipas.viaje.inactivo}</Nota>
          ) : null}
          {viaje.estado === "pedida" ? (
            <Nota>{pipas.viaje.yaSePidio}</Nota>
          ) : null}
        </>
      }
      acciones={
        <>
          {recibe && !viaje.estoy_anotado ? (
            <Boton
              variante="primario"
              aria-label={`${pipas.viaje.anotarme} al viaje de ${viaje.proveedor}`}
              onClick={() => acciones.anotarse(viaje)}
            >
              {pipas.viaje.anotarme}
            </Boton>
          ) : null}
          <Boton
            variante="texto"
            aria-label={`${pipas.viaje.verCasas} del viaje de ${viaje.proveedor}`}
            onClick={() => acciones.ver(viaje.id)}
          >
            {pipas.viaje.verCasas}
            <Icono nombre="derecha" chico />
          </Boton>
        </>
      }
    />
  );
}
