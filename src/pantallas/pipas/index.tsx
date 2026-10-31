import { PantallaVacia } from "../../componentes";
import { comun } from "../../textos";

/** Pantalla de Pipas privadas. Por ahora solo el aviso de pantalla vacía. */
export function PantallaPipas() {
  return <PantallaVacia>{comun.vacias.pipas}</PantallaVacia>;
}
