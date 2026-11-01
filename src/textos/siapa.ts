/** Textos de la pantalla de Folios SIAPA. */
import type { Canal, CodigoError } from "../api";

export const siapa = {
  resumen: (casa: string, activos: number, tope: number) =>
    `Casa ${casa} · ${activos} ${activos === 1 ? "activo" : "activos"} de ${tope}`,
  registrar: "Registrar folio",
  listaActivos: "Folios activos",
  vacio:
    "Todavía no has registrado folios. Toca «Registrar folio» para empezar.",
  sinActivos:
    "No tienes folios activos. Toca «Registrar folio» si necesitas uno nuevo.",
  cargando: "Cargando tus folios…",
  noCargo: "No pudimos cargar tus folios. ¿Lo intentas otra vez?",
  reintentar: "Intentar otra vez",
  anteriores: (n: number) => `Folios anteriores (${n})`,
  avisoPermanente:
    "Tus folios vencen solos a los 3 días. La página no manda avisos: revisa aquí. Así se diseñó para que la lista esté siempre al día.",
  canal: { whatsapp: "WhatsApp", telefono: "Teléfono" } as Record<
    Canal,
    string
  >,
  insignia: {
    activo: "Activo",
    venceHoy: "Vence hoy",
    vencio: "Venció",
    surtido: "Surtido",
    reemplazado: "Reemplazado",
  },
  lleva: (n: number) =>
    n < 1 ? "Lleva menos de un día" : `Lleva ${n} ${n === 1 ? "día" : "días"}`,
  registradoEl: (fecha: string) => `Registrado el ${fecha}`,
  surtidoEl: (fecha: string) => `Surtido el ${fecha}`,
  reemplazadoEl: (fecha: string) => `Reemplazado el ${fecha}`,
  enviadoCaseta: (fecha: string) => `Enviado a caseta el ${fecha}`,
  extendido: (fecha: string) =>
    `Ya le diste más tiempo una vez. Vigente hasta el ${fecha}.`,
  enSuLugar: (codigo: string) => `En su lugar quedó ${codigo}`,
  acciones: {
    surtieron: "Me surtieron",
    pendiente: "Sigue pendiente",
    reemplazar: "Reemplazar por uno nuevo",
  },
  registro: {
    titulo: "Registrar folio",
    etiqueta: "Folio",
    ayuda: "Empieza con SIAPAZAP (WhatsApp) o con 1162 (teléfono).",
    /** El campo agrega la palomita. */
    canalDetectado: (canal: Canal) =>
      canal === "whatsapp" ? "WhatsApp" : "Teléfono",
    confirmar: "Registrar",
    regresar: "No, regresar",
  },
  eligeReemplazo: {
    descripcion: (canal: Canal) =>
      `Ya tienes 2 folios de ${canal === "whatsapp" ? "WhatsApp" : "teléfono"} activos. ¿Cuál reemplaza este nuevo?`,
    opcion: (codigo: string) => `Reemplazar ${codigo}`,
  },
  reemplazo: {
    titulo: "¿Reemplazar este folio?",
    aviso: (codigo: string) =>
      `El folio ${codigo} dejará de estar en la lista y no se puede volver a usar. Este nuevo folio quedará en su lugar.`,
    confirmar: "Sí, reemplazar",
  },
  surtieron: {
    titulo: "¿Te surtieron con este folio?",
    descripcion: "Lo quitaremos de la lista.",
    quemarOtros: (n: number) =>
      `Quitar también mis otros folios activos (${n})`,
    confirmar: "Sí, me surtieron",
  },
  pendiente: {
    titulo: "¿Sigue pendiente?",
    descripcion: (fecha: string) =>
      `Esto lo puedes hacer una sola vez por folio. Quedará vigente hasta el ${fecha}.`,
    confirmar: "Sí, sigue pendiente",
  },
  hecho: {
    registrado: (codigo: string) => `Listo, registramos el folio ${codigo}.`,
    reemplazado: (codigo: string) => `Listo, ${codigo} quedó en su lugar.`,
    surtido: "Listo, quitamos el folio de la lista.",
    pendiente: "Listo, le diste más tiempo al folio.",
  },
  errores: {
    FOLIO_FORMATO_INVALIDO:
      "Revisa el folio: debe empezar con SIAPAZAP (WhatsApp) o con 1162 (teléfono).",
    FOLIO_YA_USADO:
      "Este folio ya se había registrado, por eso no se puede usar otra vez.",
    YA_EXTENDIDO:
      "A este folio ya le diste más tiempo una vez, y solo se puede una vez.",
    FUERA_DE_PLAZO:
      "Este folio ya cumplió 6 días. Si volviste a reportar, puedes registrar uno nuevo.",
    NO_AUTORIZADO: "Esta opción es solo para el equipo de coordinación.",
    // Sin texto en 07: redacción propia, suave y en «tú».
    REEMPLAZO_INVALIDO:
      "Ese folio no se puede reemplazar. Elige uno activo del mismo tipo.",
    FOLIO_CERRADO:
      "Este folio ya no está en la lista, así que no se puede cambiar.",
    NO_ENCONTRADO:
      "No encontramos este folio. Revisa la lista e intenta otra vez.",
  } as Partial<Record<CodigoError, string>>,
  /** `TOPE_CANAL` no es error aquí: abre la elección de reemplazo. */
  /** Reemplazo desde la tarjeta con un folio nuevo de otro canal. */
  reemplazoOtroCanal: (canal: Canal) =>
    `Para reemplazarlo, el folio nuevo debe ser de ${canal === "whatsapp" ? "WhatsApp" : "teléfono"}, igual que el que quitas.`,
  fallo: "Algo no salió como esperábamos. ¿Lo intentas otra vez?",
} as const;
