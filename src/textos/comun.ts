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
    noEncontrada: "Usa las pestañas para volver.",
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
    aljibe: "Mostrar nivel del aljibe (prueba)",
    confirmarReinicio: "Se borran los cambios y vuelven los datos de ejemplo.",
    tituloReiniciar: "¿Reiniciar el demo?",
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
  contactos: {
    titulo: "Contactos oficiales",
    ayuda: "Si necesitas reportar, puedes llamar o escribir aquí.",
    enlaces: [
      {
        nombre: "WhatsApp del Gobierno de Zapopan",
        numero: "+52 33 3818 2222",
        href: "https://wa.me/523338182222",
      },
      {
        nombre: "Teléfono del SIAPA",
        numero: "33 3668 2482",
        href: "tel:+523336682482",
      },
      {
        nombre: "WhatsApp del SIAPA",
        numero: "+52 33 5164 4440",
        href: "https://wa.me/523351644440",
      },
    ],
  },
} as const;
