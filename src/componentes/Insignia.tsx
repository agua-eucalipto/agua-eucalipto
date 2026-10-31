import { Icono, type NombreIcono } from "./Icono";

/** Los 10 estados de la guía visual: cada uno con texto, ícono y forma propios. */
export type EstadoVisual =
  | "activo"
  | "vence-hoy"
  | "vencio"
  | "surtido"
  | "reemplazado"
  | "juntando"
  | "lista"
  | "pedida"
  | "paso"
  | "cerrado";

const ICONOS: Record<EstadoVisual, NombreIcono> = {
  activo: "gota",
  "vence-hoy": "alerta",
  vencio: "reloj-arena",
  surtido: "check",
  reemplazado: "cambio",
  juntando: "personas",
  lista: "check-circulo",
  pedida: "pipa",
  paso: "bandera",
  cerrado: "x-circulo",
};

/** Pastilla no tocable: `texto` viene de la capa de textos. */
export function Insignia({
  estado,
  texto,
}: {
  estado: EstadoVisual;
  texto: string;
}) {
  return (
    <span class={`insignia insignia--${estado}`}>
      <Icono nombre={ICONOS[estado]} />
      <span>{texto}</span>
    </span>
  );
}

export type TonoMarca = "prioridad" | "alerta" | "neutra";

/** Marca de una casa dentro de un viaje: texto con ícono, sin pastilla. */
export function MarcaFila({
  tono,
  icono,
  texto,
}: {
  tono: TonoMarca;
  icono: NombreIcono;
  texto: string;
}) {
  return (
    <span class={`marca-fila marca-fila--${tono}`}>
      <Icono nombre={icono} chico />
      {texto}
    </span>
  );
}

/** Puntos de avance de un viaje: llenos = anotadas, vacíos = faltan para el mínimo. */
export function AvanceViaje({
  anotadas,
  minimo,
}: {
  anotadas: number;
  minimo: number;
}) {
  const total = Math.max(minimo, anotadas);
  return (
    <span class="avance" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          class={
            i < anotadas
              ? "avance__punto avance__punto--lleno"
              : "avance__punto"
          }
        />
      ))}
    </span>
  );
}
