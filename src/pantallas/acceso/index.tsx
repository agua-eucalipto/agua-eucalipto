/**
 * Primera vez: aviso de entrada, tutorial y acceso. Se pinta encima de la app;
 * mientras no haya nada que mostrar devuelve `null`.
 */
import { useEffect, useState } from "preact/hooks";
import { sesion } from "../../app/servicios";
import { AvisoEntrada } from "./Aviso";
import { Ingreso } from "./Ingreso";
import { Tutorial } from "./Tutorial";
import "./acceso.css";
import {
  fase,
  iniciarIntroduccion,
  pasarAlTutorial,
  repaso,
  terminarIntroduccion,
} from "./estado";

export { verIntroduccionOtraVez } from "./estado";

export function PrimeraVez() {
  // El shell arranca la sesión de forma asíncrona; hasta que llega la primera
  // sesión real no se muestra el acceso, para que no parpadee al abrir.
  const [arrancado, setArrancado] = useState(sesion.value.rol !== "sin_sesion");
  const rol = sesion.value.rol;

  useEffect(() => {
    iniciarIntroduccion();
  }, []);
  useEffect(() => {
    if (rol !== "sin_sesion") setArrancado(true);
  }, [rol]);

  if (fase.value === "aviso") {
    return <AvisoEntrada alEntender={pasarAlTutorial} />;
  }
  if (fase.value === "tutorial") {
    return (
      <Tutorial
        alTerminar={terminarIntroduccion}
        alEscape={repaso.value ? terminarIntroduccion : undefined}
      />
    );
  }
  if (rol === "pendiente") return <Ingreso pendiente />;
  if (rol === "sin_sesion" && arrancado) return <Ingreso pendiente={false} />;
  return null;
}
