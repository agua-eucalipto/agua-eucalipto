import { useState } from "preact/hooks";
import type { DatosAbrirViaje, ViajeVista } from "../../api";
import { Aviso, Boton, CampoGrande, Casilla } from "../../componentes";
import { MINIMO_CASAS_POR_DEFECTO, MINIMO_CASAS_RANGO } from "../../dominio";
import { textos } from "../../textos";

const { pipas } = textos;

export interface DatosFormulario {
  proveedor: string;
  precio_por_casa?: number;
  minimo_casas: number;
  capacidad_aprox?: number;
  acepta: boolean;
}

/** "" → sin dato; cualquier otra cosa se manda tal cual para que la `Api` decida. */
function numeroOpcional(texto: string): number | undefined {
  const limpio = texto.trim();
  return limpio === "" ? undefined : Number(limpio);
}

/**
 * Formulario de una pantalla para abrir o editar un viaje. No valida reglas:
 * manda lo escrito a la `Api` y muestra su respuesta.
 */
export function FormularioViaje({
  viaje,
  error,
  enviando,
  alEnviar,
  volver,
}: {
  /** Con `viaje`, el formulario edita; sin él, abre uno nuevo. */
  viaje?: ViajeVista;
  error: string | null;
  enviando: boolean;
  alEnviar: (datos: DatosFormulario) => void;
  volver: () => void;
}) {
  const edita = viaje !== undefined;
  const [proveedor, setProveedor] = useState(viaje?.proveedor ?? "");
  const [precio, setPrecio] = useState(
    viaje?.precio_por_casa != null ? String(viaje.precio_por_casa) : "",
  );
  const [minimo, setMinimo] = useState(
    viaje?.minimo_casas ?? MINIMO_CASAS_POR_DEFECTO,
  );
  const [capacidad, setCapacidad] = useState(
    viaje?.capacidad_aprox != null ? String(viaje.capacidad_aprox) : "",
  );
  const [acepta, setAcepta] = useState(false);
  const { min, max } = MINIMO_CASAS_RANGO;

  const enviar = (e: Event) => {
    e.preventDefault();
    if (enviando) return;
    alEnviar({
      proveedor,
      precio_por_casa: numeroOpcional(precio),
      minimo_casas: minimo,
      capacidad_aprox: numeroOpcional(capacidad),
      acepta,
    });
  };

  return (
    <>
      <Boton variante="texto" onClick={volver}>
        <span aria-hidden="true">←</span> {pipas.formulario.volver}
      </Boton>
      <div class="titulo-pantalla">
        <h2 id="titulo-vista" tabIndex={-1}>
          {edita ? pipas.formulario.tituloEditar : pipas.formulario.tituloAbrir}
        </h2>
      </div>
      <form class="tarjeta" onSubmit={enviar} noValidate>
        <CampoGrande
          id="viaje-proveedor"
          etiqueta={pipas.formulario.proveedor}
          ayuda={pipas.formulario.proveedorAyuda}
          valor={proveedor}
          onInput={setProveedor}
          autoCapitalize="words"
        />
        <CampoGrande
          id="viaje-precio"
          etiqueta={pipas.formulario.precio}
          ayuda={pipas.formulario.precioAyuda}
          valor={precio}
          onInput={setPrecio}
          inputMode="numeric"
        />
        <div class="campo" role="group" aria-labelledby="viaje-minimo-etiqueta">
          <span class="campo__etiqueta" id="viaje-minimo-etiqueta">
            {pipas.formulario.minimo}
          </span>
          <p class="campo__ayuda">{pipas.formulario.minimoAyuda}</p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--e-3)",
            }}
          >
            <Boton
              variante="secundario"
              aria-label={pipas.formulario.menos}
              deshabilitado={minimo <= min}
              onClick={() => setMinimo(Math.max(min, minimo - 1))}
            >
              −
            </Boton>
            <output
              class="tiempo"
              aria-live="polite"
              style={{ minWidth: "2ch", textAlign: "center" }}
            >
              {minimo}
            </output>
            <Boton
              variante="secundario"
              aria-label={pipas.formulario.mas}
              deshabilitado={minimo >= max}
              onClick={() => setMinimo(Math.min(max, minimo + 1))}
            >
              +
            </Boton>
          </div>
        </div>
        <CampoGrande
          id="viaje-capacidad"
          etiqueta={pipas.formulario.capacidad}
          ayuda={pipas.formulario.capacidadAyuda}
          valor={capacidad}
          onInput={setCapacidad}
          inputMode="numeric"
        />
        {edita ? null : (
          <>
            <p>{pipas.disclaimerResponsable.texto}</p>
            <Casilla id="viaje-acepta" marcada={acepta} onCambio={setAcepta}>
              {pipas.disclaimerResponsable.casilla}
            </Casilla>
          </>
        )}
        {error ? <Aviso tono="error">{error}</Aviso> : null}
        <Boton variante="primario" type="submit" ancho>
          {edita ? pipas.formulario.guardar : pipas.formulario.abrir}
        </Boton>
      </form>
    </>
  );
}

/** Pasa lo escrito al formato de la `Api` para abrir un viaje. */
export function datosParaAbrir(d: DatosFormulario): DatosAbrirViaje {
  return {
    proveedor: d.proveedor,
    ...(d.precio_por_casa !== undefined && {
      precio_por_casa: d.precio_por_casa,
    }),
    minimo_casas: d.minimo_casas,
    ...(d.capacidad_aprox !== undefined && {
      capacidad_aprox: d.capacidad_aprox,
    }),
    // Si no marcó la casilla se manda `false` a propósito: la `Api` responde
    // FALTA_ACEPTAR y la pantalla muestra su texto.
    acepta_responsabilidad: d.acepta as true,
  };
}
