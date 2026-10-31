/** Textos de la pantalla de pipas privadas. */

const unaOVarias = (n: number, una: string, varias: string) =>
  n === 1 ? `1 ${una}` : `${n} ${varias}`;

export const pipas = {
  disclaimer:
    "Cada pipero decide a quién surte, así que anotarte no asegura que te toque agua. Esta lista solo nos ayuda a organizarnos entre vecinos.",
  cargando: "Cargando…",
  noSePudoCargar: "Algo no salió como esperábamos. ¿Lo intentas otra vez?",
  reintentar: "Intentar otra vez",

  situacion: {
    titulo: "Mi situación",
    nada: "Tu casa no está en ningún viaje",
    anotarme: "Anotarme a un viaje",
    meDaIgual: "Me da igual el proveedor",
    abrir: "Abrir un viaje",
    enViaje: (proveedor: string, lugar: number, total: number) =>
      `Estás en el viaje de ${proveedor} · Lugar ${lugar} de ${total}`,
    coordinas: (proveedor: string, lugar: number, total: number) =>
      `Coordinas el viaje de ${proveedor} · Lugar ${lugar} de ${total}`,
    verViaje: "Ver el viaje",
    darmeDeBaja: "Darme de baja",
    enEspera: "Estás en espera, cualquier proveedor",
    enEsperaDetalle: (desde: string, conPrioridad: boolean) =>
      `${desde}${conPrioridad ? " · con prioridad" : ""}`,
    seguiremos: "Te sumaremos al siguiente viaje que se abra.",
    salirEspera: "Salir de la espera",
    preguntaEntrega: (proveedor: string) => `¿Te surtió ${proveedor}?`,
    siMeSurtio: "Sí, me surtió",
    sigoPendiente: "No, sigo pendiente",
  },

  secciones: {
    abiertos: "Viajes abiertos",
    pasaron: "Pasaron recientemente",
    espera: "En espera",
    casas: (n: number) => `Casas anotadas (${n})`,
    estado: "Estado del viaje",
  },
  vacios: {
    viajes: "No hay viajes abiertos. Puedes abrir uno o anotarte en espera.",
    espera: "Por ahora nadie está en espera.",
  },

  viaje: {
    juntando: (anotadas: number, minimo: number) =>
      `Juntando (${anotadas} de ${minimo})`,
    lista: "Listo para pedir",
    pedida: (eta: string) => `Pedido · llega ${eta}`,
    pedidaSinHora: "Pedido",
    yaPaso: "Ya pasó",
    cerrado: "Cerrado sin completarse",
    precio: (pesos: number) => `$${pesos} por casa`,
    coordina: (casa: string) => `Coordina Casa ${casa}`,
    coordinas: "Tú coordinas este viaje",
    alcanzaPara: (n: number) => `Alcanza para unas ${n} casas`,
    puedeQueNoAlcance: "Puede que no alcance",
    yaEstasAqui: "Ya estás aquí",
    yaSePidio:
      "Este viaje ya se pidió. Si alguien más necesita agua, puede abrir el siguiente viaje.",
    inactivo:
      "Hace más de 24 horas que no hay movimiento en este viaje. Si quieres, puedes encargarte tú de coordinarlo.",
    anotarme: "Anotarme",
    verCasas: "Ver casas",
    volver: "Volver a Pipas",
    abiertoEl: (fecha: string) => `Abierto el ${fecha}`,
    pedidoEl: (fecha: string) => `Se pidió el ${fecha}`,
    pasoEl: (fecha: string) => `Pasó el ${fecha}`,
    coordinoCasa: (casa: string) => `Coordinó Casa ${casa}`,
    tomarResponsabilidad: "Tomar la responsabilidad",
    abrirSiguiente: "Abrir el siguiente viaje",
    sinSalirResponsable:
      "Quien coordina no puede darse de baja. Si ya no puedes con el viaje, puedes cancelarlo.",
  },

  casas: {
    orden:
      "Primero las casas con prioridad, luego las que llevan más tiempo. Si no alcanza, se marcan las últimas.",
    casa: (n: string) => `Casa ${n}`,
    tuCasa: "Tu casa",
    coordina: "Coordina",
    conPrioridad: "Con prioridad",
    puedeQueNoAlcance: "Puede que no alcance",
    bajaDespuesDePedido: "Se dio de baja después de pedido",
    surtio: "Surtió",
    pendiente: "Pendiente",
    sinConfirmar: "Sin confirmar",
    faltaConfirmar: "Falta confirmar",
  },

  espera: {
    cualquierProveedor: "Cualquier proveedor",
    pendiente: "Sigue pendiente de su viaje",
    viajeCerrado: "Su viaje se cerró",
    conPrioridad: "Con prioridad",
    desde: (antiguedad: string) => `Desde ${antiguedad}`,
    haceMenosDeUnaHora: "hace menos de una hora",
    haceHoras: (n: number) => `hace ${n} h`,
    haceDias: (n: number) => `hace ${unaOVarias(n, "día", "días")}`,
  },

  responsable: {
    editar: "Editar",
    yaLlame: "Ya llamé, viene en camino",
    yaPaso: "Ya pasó la pipa",
    cancelar: "Cancelar viaje",
    faltan: (n: number) =>
      n === 1
        ? "Falta 1 casa para el mínimo"
        : `Faltan ${n} casas para el mínimo`,
  },

  formulario: {
    tituloAbrir: "Abrir un viaje",
    tituloEditar: "Editar el viaje",
    proveedor: "Proveedor",
    proveedorAyuda: "Por ejemplo: Rubén 1",
    precio: "Precio por casa (opcional)",
    precioAyuda: "En pesos, solo como referencia.",
    minimo: "Mínimo de casas",
    minimoAyuda: "El viaje queda listo para pedir cuando se anoten tantas.",
    menos: "Una casa menos",
    mas: "Una casa más",
    capacidad: "¿Cuántas casas alcanzan, más o menos? (opcional)",
    capacidadAyuda: "Si se anotan más, se avisará que puede que no alcance.",
    abrir: "Abrir el viaje",
    guardar: "Guardar cambios",
    volver: "Volver a Pipas",
    revisa:
      "Revisa los datos: escribe el proveedor (hasta 40 letras), un mínimo de 1 a 30 casas, y que las casas que alcanzan no sean menos que el mínimo.",
  },

  disclaimerResponsable: {
    texto:
      "Gracias por abrir este viaje. Quien lo abre ayuda a coordinarlo: llamar al pipero, avisar cuándo viene y marcar cuando ya pasó. Si pasan 24 horas sin movimiento, otro vecino anotado podrá tomar tu lugar.",
    casilla: "Lo entiendo y estoy de acuerdo",
  },

  dialogos: {
    noRegresar: "No, regresar",
    baja: {
      titulo: (proveedor: string) => `¿Darte de baja de ${proveedor}?`,
      descripcion: "Dejarás tu lugar en la lista.",
      descripcionPedida:
        "Este viaje ya se pidió. Los demás vecinos verán que te diste de baja después de pedido.",
      si: "Sí, darme de baja",
    },
    pedir: {
      titulo: "¿Ya llamaste al pipero?",
      descripcion:
        "Avisaremos a los vecinos que el viaje ya se pidió. ¿Cuánto tarda en llegar, más o menos?",
      grupo: "Hora aproximada de llegada",
      opciones: [
        { etiqueta: "~1 h", eta: "en ~1 h" },
        { etiqueta: "~2 h", eta: "en ~2 h" },
        { etiqueta: "~4 h", eta: "en ~4 h" },
        { etiqueta: "Hoy", eta: "hoy" },
      ],
      otro: "Otro",
      otroEtiqueta: "¿Cuándo llega, más o menos?",
      otroEjemplo: "Por ejemplo: mañana por la tarde",
      elige: "Elige cuándo llega, más o menos.",
      si: "Sí, ya llamé",
    },
    yaPaso: {
      titulo: "¿Ya pasó la pipa?",
      descripcion: "Cada casa anotada podrá decir si le surtieron.",
      si: "Sí, ya pasó",
    },
    cancelar: {
      titulo: "¿Cancelar el viaje?",
      descripcion:
        "Las casas anotadas pasarán a la espera y conservarán su antigüedad.",
      si: "Sí, cancelar el viaje",
    },
    tomar: {
      titulo: "¿Quieres encargarte de este viaje?",
      si: "Sí, me encargo",
    },
  },

  exito: {
    anotado: (proveedor: string) =>
      `Listo. Tu casa quedó anotada en el viaje de ${proveedor}.`,
    baja: (proveedor: string) =>
      `Listo. Tu casa salió del viaje de ${proveedor}.`,
    meDaIgualViaje: (proveedor: string) =>
      `Listo. Tu casa quedó anotada en el viaje de ${proveedor}.`,
    meDaIgualEspera:
      "Estás en espera, cualquier proveedor. Te sumaremos al siguiente viaje que se abra.",
    abierto: "Listo. Tu viaje está abierto.",
    sumadas: (n: number) =>
      n === 1
        ? "Se sumó 1 casa que estaba en espera"
        : `Se sumaron ${n} casas que estaban en espera`,
    editado: "Listo. Guardamos los cambios del viaje.",
    pedida: "Listo. Ya avisamos que el viaje se pidió.",
    yaPaso: "Listo. Ahora cada casa anotada puede confirmar si le surtieron.",
    surtio: "Gracias por avisar.",
    pendiente: "Gracias por avisar. Tu casa quedó en espera, con prioridad.",
    tomada: "Listo. Ahora tú coordinas este viaje.",
    cancelado: "Listo. Cancelaste el viaje y las casas pasaron a la espera.",
    saliste: "Listo. Saliste de la espera.",
  },

  errores: {
    YA_EN_VIAJE:
      "Ya estás anotado en otro viaje. Si prefieres este, primero sal del otro.",
    VIAJE_CERRADO: "Este viaje ya no recibe más casas.",
    NO_ESTA_LISTA: "Aún faltan algunas casas para llegar al mínimo.",
    RESPONSABLE_ACTIVO:
      "Quien coordina el viaje sigue al pendiente. Si pasan 24 horas sin movimiento, podrás encargarte tú.",
    FALTA_ACEPTAR: "Para continuar, marca la casilla de confirmación.",
    NO_AUTORIZADO: "Esta opción es solo para el equipo de coordinación.",
    NO_ES_RESPONSABLE: "Solo quien coordina el viaje puede hacer esto.",
    NO_ANOTADO: "Para hacer esto, tu casa tiene que estar anotada en el viaje.",
    ES_RESPONSABLE:
      "Quien coordina no puede darse de baja. Si ya no puedes con el viaje, puedes cancelarlo.",
    NO_ESTA_PEDIDA: "Este viaje todavía no se ha pedido.",
    NO_HA_PASADO: "Este viaje todavía no ha pasado.",
    YA_CONFIRMADO: "Ya nos habías contestado sobre este viaje.",
    NO_EN_ESPERA: "Tu casa ya no estaba en espera.",
    DATOS_INVALIDOS:
      "Revisa los datos: escribe el proveedor (hasta 40 letras), un mínimo de 1 a 30 casas, y que las casas que alcanzan no sean menos que el mínimo.",
    NO_ENCONTRADO: "Ya no encontramos este viaje. Puede que haya cambiado.",
    inesperado: "Algo no salió como esperábamos. ¿Lo intentas otra vez?",
  },
} as const;
