/** Único lugar de los textos visibles. Cada pantalla suma su módulo aquí. */
import { acceso } from "./acceso";
import { aljibe } from "./aljibe";
import { comun } from "./comun";
import { coordinador } from "./coordinador";
import { info } from "./info";
import { pipas } from "./pipas";
import { siapa } from "./siapa";

export const textos = {
  comun,
  siapa,
  pipas,
  coordinador,
  acceso,
  info,
  aljibe,
} as const;

export { acceso, aljibe, comun, coordinador, info, pipas, siapa };
