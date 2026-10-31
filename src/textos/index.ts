/** Único lugar de los textos visibles. Cada pantalla suma su módulo aquí. */
import { acceso } from "./acceso";
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
} as const;

export { acceso, comun, coordinador, info, pipas, siapa };
