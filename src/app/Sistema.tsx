import { useState } from "preact/hooks";
import {
  Aviso,
  AvanceViaje,
  Boton,
  BotonIcono,
  CampoGrande,
  Casilla,
  Dialogo,
  Insignia,
  MarcaFila,
  TarjetaFolio,
  TarjetaViaje,
  type EstadoVisual,
} from "../componentes";

const ESTADOS: [EstadoVisual, string][] = [
  ["activo", "Activo"],
  ["vence-hoy", "Vence hoy"],
  ["vencio", "Venció"],
  ["surtido", "Surtido"],
  ["reemplazado", "Reemplazado"],
  ["juntando", "Juntando (3 de 5)"],
  ["lista", "Listo para pedir"],
  ["pedida", "Pedido · llega en ~2 h"],
  ["paso", "Ya pasó"],
  ["cerrado", "Cerrado sin completarse"],
];

/** Catálogo de componentes con todos sus estados. Solo en desarrollo. */
export default function Sistema() {
  const [texto, setTexto] = useState("SIAPAZAP2026");
  const [marcada, setMarcada] = useState(true);
  const [dialogo, setDialogo] = useState(false);
  return (
    <>
      <section class="seccion" aria-labelledby="s-botones">
        <h2 id="s-botones">Botones</h2>
        <div class="acciones" data-grupo="botones">
          <Boton variante="primario" icono="mas">
            Registrar folio
          </Boton>
          <Boton variante="secundario">Sigue pendiente</Boton>
          <Boton variante="texto">Reemplazar por uno nuevo</Boton>
          <BotonIcono icono="info" etiqueta="Información" />
        </div>
        <div class="acciones" data-grupo="deshabilitados">
          <Boton
            variante="primario"
            id="b-dis"
            deshabilitado
            razon="Faltan 2 casas para el mínimo"
          >
            Ya llamé, viene en camino
          </Boton>
          <Boton variante="secundario" deshabilitado>
            Sigue pendiente
          </Boton>
          <BotonIcono
            icono="info"
            etiqueta="Información (deshabilitado)"
            deshabilitado
          />
        </div>
      </section>
      <section class="seccion" aria-labelledby="s-ins">
        <h2 id="s-ins">Estados</h2>
        <div class="acciones">
          {ESTADOS.map(([e, t]) => (
            <Insignia key={e} estado={e} texto={t} />
          ))}
        </div>
        <div class="acciones">
          <MarcaFila tono="prioridad" icono="estrella" texto="Con prioridad" />
          <MarcaFila
            tono="alerta"
            icono="alerta"
            texto="Puede que no alcance"
          />
          <MarcaFila tono="neutra" icono="reloj" texto="Pendiente" />
        </div>
      </section>
      <section class="seccion dos-columnas" aria-labelledby="s-tar">
        <h2 id="s-tar">Tarjetas</h2>
        <TarjetaFolio
          insignia={<Insignia estado="vence-hoy" texto="Vence hoy" />}
          canal={{ icono: "chat", texto: "WhatsApp" }}
          codigo="SIAPAZAP20261001"
          tiempo="Lleva 2 días"
          fecha="Registrado el jue 29 oct, 8:00"
          notas={[
            { icono: "check", texto: "Enviado a caseta el vie 30 oct, 14:00" },
          ]}
          acciones={
            <>
              <Boton variante="primario">Me surtieron</Boton>
              <Boton variante="secundario">Sigue pendiente</Boton>
            </>
          }
        />
        <TarjetaViaje
          proveedor="Don Beto"
          insignia={<Insignia estado="juntando" texto="Juntando (3 de 5)" />}
          avance={<AvanceViaje anotadas={3} minimo={5} />}
          detalles={["$150 por casa"]}
          acciones={<Boton variante="primario">Anotarme</Boton>}
        />
      </section>
      <section class="seccion" aria-labelledby="s-cam">
        <h2 id="s-cam">Campos</h2>
        <CampoGrande
          id="c-ok"
          etiqueta="Número de folio"
          ayuda="Empieza con SIAPAZAP (WhatsApp) o con 1162 (teléfono)."
          valor={texto}
          onInput={setTexto}
          confirmacion="WhatsApp"
          autoCapitalize="characters"
        />
        <CampoGrande
          id="c-error"
          etiqueta="Número de folio"
          valor="123"
          onInput={() => undefined}
          error="Revisa el folio: debe empezar con SIAPAZAP (WhatsApp) o con 1162 (teléfono)."
        />
        <CampoGrande
          id="c-dis"
          etiqueta="Campo deshabilitado"
          valor=""
          onInput={() => undefined}
          deshabilitado
        />
        <Casilla id="k-1" marcada={marcada} onCambio={setMarcada}>
          Quitar también mis otros folios activos (2)
        </Casilla>
        <Casilla
          id="k-2"
          marcada={false}
          onCambio={() => undefined}
          deshabilitada
        >
          Casilla deshabilitada
        </Casilla>
      </section>
      <section class="seccion" aria-labelledby="s-avi">
        <h2 id="s-avi">Avisos y diálogo</h2>
        <Aviso>Tus folios vencen solos a los 3 días.</Aviso>
        <Aviso tono="atencion">Puede que no alcance.</Aviso>
        <Aviso tono="error">Este folio ya se había registrado.</Aviso>
        <Boton
          variante="secundario"
          id="abrir-dialogo"
          onClick={() => setDialogo(true)}
        >
          Abrir diálogo
        </Boton>
        {dialogo ? (
          <Dialogo
            titulo="¿Te surtieron con este folio?"
            descripcion="Lo quitaremos de la lista."
            onCerrar={() => setDialogo(false)}
          >
            <Casilla id="k-d" marcada onCambio={() => undefined}>
              Quitar también mis otros folios activos (2)
            </Casilla>
            <div class="acciones acciones--pila">
              <Boton
                variante="primario"
                ancho
                focoInicial
                onClick={() => setDialogo(false)}
              >
                Sí, me surtieron
              </Boton>
              <Boton
                variante="secundario"
                ancho
                onClick={() => setDialogo(false)}
              >
                No, regresar
              </Boton>
            </div>
          </Dialogo>
        ) : null}
      </section>
    </>
  );
}
