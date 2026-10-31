import { PantallaVacia } from "../../componentes";
import { comun } from "../../textos";

/** Pantalla de Folios SIAPA. Por ahora solo el aviso de pantalla vacía. */
export function PantallaSiapa() {
  return <PantallaVacia>{comun.vacias.siapa}</PantallaVacia>;
}
