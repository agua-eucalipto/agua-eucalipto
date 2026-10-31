import type { ListaCaseta, OpcionesListaCaseta } from "../../api";
import { coordinador } from "../../textos";

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const t = coordinador.caseta;

/** "lun 2 nov, 9:00" o, con año, "lun 2 nov 2026, 9:00". */
export function fechaLista(ms: number, conAnio = false): string {
  const d = new Date(ms);
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dia = `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
  return conAnio ? `${dia} ${d.getFullYear()}, ${hora}` : `${dia}, ${hora}`;
}

export function diasTexto(dias: number): string {
  if (dias <= 0) return t.menosDeUnDia;
  return dias === 1 ? t.unDia : t.dias(dias);
}

export function canalTexto(canal: "whatsapp" | "telefono"): string {
  return canal === "telefono" ? t.canalTelefono : t.canalWhatsApp;
}

/** "5500000003" → "55 0000 0003". Cualquier otra cosa se deja tal cual. */
export function telefonoLegible(numero: string): string {
  return /^\d{10}$/.test(numero)
    ? `${numero.slice(0, 2)} ${numero.slice(2, 6)} ${numero.slice(6)}`
    : numero;
}

/**
 * Texto para WhatsApp, en el formato fijo de la lista para caseta:
 * encabezado, fecha, una línea por casa y total. Los datos opcionales van
 * entre paréntesis después de cada código.
 */
export function textoWhatsApp(
  lista: ListaCaseta,
  opciones: Pick<OpcionesListaCaseta, "canal" | "dias">,
): string {
  const lineas = lista.filas.map((fila) => {
    const folios = fila.folios.map((f) => {
      const extra = [
        ...(opciones.canal ? [canalTexto(f.canal)] : []),
        ...(opciones.dias ? [diasTexto(f.dias_que_lleva)] : []),
      ];
      return extra.length > 0 ? `${f.codigo} (${extra.join(", ")})` : f.codigo;
    });
    return `${t.casa(fila.casa_numero)}: ${folios.join(", ")}`;
  });
  return [
    t.encabezadoWhatsApp,
    fechaLista(lista.generada_at, true),
    "",
    ...lineas,
    t.total(lista.total_casas, lista.total_folios),
  ].join("\n");
}
