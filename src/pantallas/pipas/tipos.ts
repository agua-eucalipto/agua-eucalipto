import type { ResultadoEntrega, ViajeVista } from "../../api";

export type TipoDialogo = "baja" | "pedir" | "yaPaso" | "cancelar" | "tomar";

/** Lo que las tarjetas y los detalles pueden pedirle a la pantalla. */
export interface AccionesPipas {
  ver: (viajeId: string) => void;
  anotarse: (viaje: ViajeVista) => void;
  meDaIgual: () => void;
  nuevo: () => void;
  editar: (viaje: ViajeVista) => void;
  salirDeEspera: () => void;
  confirmarEntrega: (viaje: ViajeVista, resultado: ResultadoEntrega) => void;
  dialogo: (tipo: TipoDialogo, viaje: ViajeVista) => void;
}
