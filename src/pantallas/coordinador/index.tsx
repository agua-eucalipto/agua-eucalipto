import { PantallaVacia } from "../../componentes";
import { comun } from "../../textos";

/** Pantalla de Coordinación. Por ahora solo el aviso de pantalla vacía. */
export function PantallaCoordinador() {
  return <PantallaVacia>{comun.vacias.coordinador}</PantallaVacia>;
}
