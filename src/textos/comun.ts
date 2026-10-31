/** Textos comunes de la interfaz: marca, navegación, barra de demo y estados. */
export const comun = {
  marca: {
    nombre: "Agua Eucalipto",
    subtitulo: "Lista vecinal de folios y pipas",
    piloto: "Piloto en la calle Eucalipto",
  },
  saltarAlContenido: "Saltar al contenido",
  navegacion: {
    etiqueta: "Secciones",
    siapa: "Folios SIAPA",
    pipas: "Pipas privadas",
    coordinador: "Coordinación",
    informacion: "Información",
  },
  titulos: {
    siapa: "Folios SIAPA",
    pipas: "Pipas privadas",
    coordinador: "Coordinación",
    informacion: "Información",
    noEncontrada: "No encontramos esta página",
  },
  vacias: {
    siapa: "Aquí aparecerán los folios de tu casa.",
    pipas: "Aquí aparecerán los viajes de pipas.",
    coordinador: "Aquí estará el panel de coordinación.",
    informacion:
      "Aquí estarán el resumen, las reglas, la bitácora y la privacidad.",
    noEncontrada: "Usa las pestañas de abajo para volver.",
  },
  demo: {
    etiqueta: "DEMO",
    sufijo: "datos de ejemplo",
    region: "Controles del demo",
    plegar: "Demo",
    verComo: "Ver como",
    vecino: "Vecino",
    coordinador: "Coordinador",
    otraCalle: "Vecino de otra calle",
    casa: "Casa",
    adelantar: "Adelantar 1 día",
    reiniciar: "Reiniciar",
    confirmarReinicio:
      "¿Reiniciar el demo? Se borran los cambios y vuelven los datos de ejemplo.",
    siReiniciar: "Sí, reiniciar",
    noRegresar: "No, regresar",
    dia: (n: number) => `Día +${n}`,
    adelantado: (fecha: string, dias: number) =>
      `Ahora es ${fecha} (adelantado ${dias} ${dias === 1 ? "día" : "días"})`,
    fallo: "Algo no salió como esperábamos. ¿Lo intentas otra vez?",
  },
  acceso: {
    coordinacion: "Coordinación",
    sinSesion: "Sin sesión",
    casa: (n: string) => `Casa ${n}`,
  },
  noAutorizado: "Esta opción es solo para el equipo de coordinación.",
  estados: {
    cargando: "Cargando…",
  },
} as const;
