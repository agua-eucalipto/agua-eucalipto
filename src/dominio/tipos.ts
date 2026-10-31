export type Canal = "whatsapp" | "telefono";

export type CierreFolio = "surtido" | "reemplazado";

export type EstadoFolio = "activo" | "vencido" | CierreFolio;

export interface FolioTiempos {
  registrado_at: number;
  extendido_at: number | null;
  cierre: CierreFolio | null;
}

export type EstadoViaje =
  "juntando" | "lista" | "pedida" | "ya_paso" | "cerrado";

export interface ViajeTiempos {
  minimo_casas: number;
  pedido_at: number | null;
  paso_at: number | null;
  cerrado_sin_completar_at: number | null;
}

export type EstadoAnotacion =
  | "anotada"
  | "baja"
  | "baja_despues_de_pedida"
  | "surtio"
  | "pendiente"
  | "movida_a_espera";

export interface AnotacionOrdenable {
  estado: EstadoAnotacion;
  con_prioridad: boolean;
  antiguedad_desde: number;
  anotada_at: number;
}
