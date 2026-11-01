import { useCallback, useEffect, useState } from "preact/hooks";
import type { SolicitudAcceso, TelefonoVista } from "../../api";
import { api, mostrarAljibe, reloj, sesion } from "../../app/servicios";
import { Aviso, PantallaVacia } from "../../componentes";
import { comun, coordinador } from "../../textos";
import "./coordinador.css";
import { ListaAljibes } from "./Aljibes";
import { ListaParaCaseta } from "./ListaCaseta";
import { Solicitudes } from "./Solicitudes";
import { Telefonos } from "./Telefonos";

type Carga =
  | { fase: "cargando" }
  | { fase: "sin_permiso" }
  | { fase: "error" }
  | {
      fase: "lista";
      solicitudes: SolicitudAcceso[];
      telefonos: TelefonoVista[];
    };

/**
 * Pantalla de Coordinación. La regla de permiso es de la `Api`: si alguna
 * llamada devuelve `NO_AUTORIZADO`, no se muestra nada de la sección.
 */
export function PantallaCoordinador() {
  const [carga, setCarga] = useState<Carga>({ fase: "cargando" });
  // Releer cuando cambia la sesión o el reloj del demo.
  const rol = sesion.value.rol;
  const casa = sesion.value.casa;
  const ahora = reloj.value;
  const aljibeVisible = mostrarAljibe.value;

  const cargar = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([
        api.listar_solicitudes(),
        api.listar_telefonos(),
      ]);
      if (
        (!s.ok && s.error === "NO_AUTORIZADO") ||
        (!t.ok && t.error === "NO_AUTORIZADO")
      ) {
        setCarga({ fase: "sin_permiso" });
      } else if (s.ok && t.ok) {
        setCarga({ fase: "lista", solicitudes: s.datos, telefonos: t.datos });
      } else {
        setCarga({ fase: "error" });
      }
    } catch {
      setCarga({ fase: "error" });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, rol, casa, ahora]);

  const sinPermiso = () => setCarga({ fase: "sin_permiso" });

  if (carga.fase === "cargando") {
    return <PantallaVacia>{coordinador.cargando}</PantallaVacia>;
  }
  if (carga.fase === "sin_permiso") {
    return <Aviso tono="atencion">{comun.noAutorizado}</Aviso>;
  }
  if (carga.fase === "error") {
    return <Aviso tono="error">{coordinador.fallo}</Aviso>;
  }
  return (
    <>
      {aljibeVisible ? <ListaAljibes /> : null}
      <div class="panel-coordinador dos-columnas">
        <ListaParaCaseta alNoAutorizado={sinPermiso} />
        <div class="seccion coordinador-lateral">
          <Solicitudes
            solicitudes={carga.solicitudes}
            alCambiar={() => void cargar()}
            alNoAutorizado={sinPermiso}
          />
          <Telefonos
            telefonos={carga.telefonos}
            alCambiar={() => void cargar()}
            alNoAutorizado={sinPermiso}
          />
        </div>
      </div>
    </>
  );
}
