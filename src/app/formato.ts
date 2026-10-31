const FECHA = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

/** "sáb 31 oct, 10:00" a partir de milisegundos desde epoch. */
export function fechaCorta(ms: number): string {
  return FECHA.format(new Date(ms))
    .replace(/\./g, "")
    .replace(" de ", " ")
    .replace(",", ",");
}
