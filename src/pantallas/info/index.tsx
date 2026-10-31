import { PantallaVacia } from "../../componentes";
import { comun } from "../../textos";

/** Pantalla de Información. Por ahora solo el aviso de pantalla vacía. */
export function PantallaInfo() {
  return <PantallaVacia>{comun.vacias.informacion}</PantallaVacia>;
}
