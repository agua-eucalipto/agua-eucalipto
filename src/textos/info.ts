/** Textos de Información: resumen, reglas, bitácora y privacidad. */
export const info = {
  secciones: {
    resumen: "Resumen",
    contactos: "Contactos oficiales",
    reglas: "Reglas",
    bitacora: "Bitácora",
    privacidad: "Privacidad",
  },
  resumen: {
    queEs: {
      titulo: "¿Qué es Agua Eucalipto?",
      texto:
        "Un pizarrón compartido para que la calle tenga una sola lista de folios del SIAPA, al día, y para organizar viajes de pipas privadas.",
    },
    porQue: {
      titulo: "¿Por qué?",
      texto:
        "Antes la lista se compartía por WhatsApp y a veces había versiones distintas o folios que ya se habían surtido. Aquí queremos una sola lista, siempre al día.",
    },
    comoFunciona: {
      titulo: "¿Cómo funciona?",
      texto:
        "Cada casa registra sus folios. Los folios vencen solos a los 3 días si nadie confirma que siguen pendientes. Los coordinadores generan la lista para la caseta con los folios vigentes.",
    },
    piloto: {
      negrita: "Piloto en Eucalipto.",
      texto:
        "Si funciona, otras calles pueden usarlo con sus propios coordinadores.",
    },
  },
  reglas: {
    folios: {
      titulo: "Folios del SIAPA",
      lista: [
        "Un folio es de WhatsApp del SIAPA (SIAPAZAP), de teléfono (1162) o del Ayuntamiento (4 dígitos).",
        "Un folio que ya se registró alguna vez no se puede usar otra vez.",
        "Cada casa puede tener hasta 2 folios activos por canal: 6 en total.",
        "Un folio dura 3 días. Si sigues sin agua, toca “Sigue pendiente” una sola vez y dura hasta 6 días.",
        "Con “Me surtieron” el folio se cierra. Por defecto también se cierran tus otros folios activos.",
        "Si un folio venció y no te surtieron, toca “No me surtieron”. Se cierra y no se reutiliza.",
        "Si quieres cambiar un folio por uno nuevo, puedes reemplazarlo.",
        "Generar la lista para la caseta no cierra ningún folio.",
      ],
    },
    pipas: {
      titulo: "Pipas privadas",
      lista: [
        "Una casa puede estar anotada en un solo viaje a la vez.",
        "Quien abre un viaje queda como responsable y se anota con su casa.",
        "El viaje está listo cuando se junta el mínimo de casas. Entonces el responsable pide la pipa.",
        "Cuando la pipa se pidió, ya no entran más casas.",
        "El orden de la lista lo da la antigüedad. Las casas que quedaron pendientes pasan primero.",
        "Después de que pasa la pipa, cada casa confirma si le surtieron o sigue pendiente.",
        "Si un viaje no termina en 72 horas, se cierra y sus casas pasan a la espera.",
        "Si quien coordina un viaje no responde en 24 horas, otra casa anotada puede encargarse.",
        "El responsable puede cancelar su viaje antes de pedir la pipa.",
      ],
    },
    iguales:
      "Las reglas son las mismas para todos y se aplican solas. Los coordinadores no pueden dar ni quitar prioridad a nadie.",
  },
  bitacora: {
    intro: "Lo que ha pasado en la lista, de lo más nuevo a lo más viejo.",
    vacia: "Todavía no hay movimientos.",
    verMas: "Ver más movimientos",
    cargando: "Cargando…",
    sinSesion: "Entra a tu casa para ver la bitácora.",
    sistema: "El sistema",
    alguien: "Alguien",
    casa: (n: string) => `Casa ${n}`,
    coordinacion: (n: string) => `Coordinación (casa ${n})`,
    hace: (texto: string) => `hace ${texto}`,
    ahora: "hace un momento",
    minutos: (n: number) => `hace ${n} min`,
    horas: (n: number) => `hace ${n} h`,
    dias: (n: number) => `hace ${n} ${n === 1 ? "día" : "días"}`,
    canal: {
      whatsapp: "WhatsApp del SIAPA",
      telefono: "teléfono del SIAPA",
      ayuntamiento: "Ayuntamiento de Zapopan",
    },
    eventos: {
      folio_registrado: (folio: string, canal: string) =>
        `registró un folio de ${canal}${folio ? ` (${folio})` : ""}`,
      folio_reemplazado: (folio: string, nuevo: string) =>
        `reemplazó un folio${folio ? ` (${folio})` : ""}${
          nuevo ? ` por ${nuevo}` : ""
        }`,
      folio_extendido: (folio: string) =>
        `dio más tiempo a un folio${folio ? ` (${folio})` : ""}`,
      folio_surtido: (folio: string) =>
        `marcó un folio como surtido${folio ? ` (${folio})` : ""}`,
      folio_cerrado_sin_surtir: (folio: string) =>
        `cerró un folio sin que le surtieran${folio ? ` (${folio})` : ""}`,
      lista_caseta_generada: () => "generó la lista para la caseta",
      viaje_abierto: () => "abrió un viaje de pipa",
      viaje_editado: () => "cambió los datos de un viaje",
      anotado: () => "se anotó en un viaje",
      anotado_cualquiera: () =>
        "se anotó en un viaje, sin importar el proveedor",
      en_espera: () => "quedó en la espera de pipas",
      baja: () => "salió de un viaje",
      baja_despues_de_pedida: () => "salió de un viaje que ya estaba pedido",
      viaje_lista: () => "llevó un viaje al mínimo de casas",
      viaje_pedido: () => "pidió la pipa de un viaje",
      viaje_paso: () => "avisó que la pipa ya pasó",
      entrega_confirmada: (resultado: string) =>
        resultado === "pendiente"
          ? "confirmó que sigue pendiente"
          : "confirmó que le surtieron",
      responsabilidad_tomada: () => "se encargó de un viaje",
      viaje_cerrado_72h: () => "cerró un viaje por pasar 72 horas sin terminar",
      viaje_cancelado: () => "canceló un viaje",
      salio_de_espera: () => "salió de la espera de pipas",
      solicitud_creada: () => "pidió acceso a la lista",
      solicitud_resuelta: () => "resolvió una solicitud de acceso",
      telefono_reiniciado: () => "reinició un teléfono",
      demo_reloj_adelantado: () => "adelantó el reloj del demo",
    },
    otro: "hizo un movimiento",
  },
  privacidad: {
    titulo: "Privacidad",
    lineas: [
      "Guardamos tu número de casa, tu teléfono, tu PIN cifrado y lo que registras.",
      "Los vecinos ven números de casa, nunca teléfonos. Los coordinadores ven teléfonos solo para dar acceso.",
      "Al terminar la crisis se borran teléfonos y PIN; solo quedan cifras anónimas por número de casa.",
    ],
  },
  tutorial: {
    titulo: "Aviso y tutorial",
    texto: "Si quieres, vuelve a ver el aviso y el tutorial.",
    boton: "Ver el aviso y el tutorial otra vez",
  },
} as const;
