/** Textos de la primera vez: aviso de entrada, tutorial y acceso. */
export const acceso = {
  aviso: {
    titulo: "Antes de empezar",
    parrafos: [
      "Esta lista la llevamos entre vecinos de la calle Eucalipto. No tiene relación con el SIAPA ni con la administración del coto.",
      "Anotarte aquí **no garantiza que te llegue agua**. Cada quien es responsable de la información que registra.",
      "Las reglas son las mismas para todos y se aplican solas. Nadie decide quién recibe agua.",
    ],
    entendido: "Entendido",
  },
  tutorial: {
    titulo: "Cómo funciona",
    region: "Pasos del tutorial",
    paso: (n: number, total: number) => `Paso ${n} de ${total}`,
    siguiente: "Siguiente",
    anterior: "Anterior",
    saltar: "Saltar",
    empezar: "Empezar",
    cerrar: "Cerrar",
    pasos: [
      {
        titulo: "Registra tus folios del SIAPA",
        texto: "Así la lista para la caseta tiene solo folios vigentes.",
        icono: "folio",
      },
      {
        titulo: "Tus folios vencen a los 3 días",
        texto:
          'Si sigues sin agua, toca "Sigue pendiente" una vez y dura hasta 6 días.',
        icono: "reloj",
      },
      {
        titulo: "Pipas privadas",
        texto:
          "Anótate a un viaje o abre uno. Quien abre el viaje llama al pipero y avisa.",
        icono: "pipa",
      },
      {
        titulo: "Es un pizarrón entre vecinos",
        texto:
          "Anotarte no asegura el agua, pero nos ayuda a estar al día. Cuida tu registro para que la lista sirva a todos.",
        icono: "personas",
      },
    ],
  },
  ingreso: {
    titulo: "Entra a tu casa",
    telefono: {
      etiqueta: "Escribe tu teléfono",
      ayuda: "El mismo que usas en el chat de Eucalipto.",
      invalido: "Revisa tu teléfono: deben ser 10 números.",
      continuar: "Continuar",
    },
    pin: {
      etiquetaEntrar: "Escribe tu PIN",
      tituloCrear: "Crea tu PIN",
      etiquetaCrear: "Crea un PIN de 4 números",
      etiquetaRepetir: "Repite tu PIN",
      ayuda: "Son 4 números. Solo tú los conoces.",
      invalido: "El PIN debe tener 4 números.",
      distinto: "Los dos PIN no son iguales. ¿Lo intentas otra vez?",
      incorrecto: "Ese PIN no coincide. ¿Lo intentas otra vez?",
      bloqueado:
        "Por seguridad, haremos una pausa de 15 minutos. También puedes pedirle a un coordinador que reinicie tu teléfono.",
      entrar: "Entrar",
    },
    casa: {
      titulo: "¿Cuál es tu casa?",
      region: "Casas de la calle Eucalipto",
      numero: (n: string) => `Casa ${n}`,
      noEstaEnLista: "Mi casa no está en la lista",
      noExiste: "No encontramos esa casa. Elige una de la lista.",
    },
    atras: "Atrás",
    telefonoFueraDeLista:
      "Ese teléfono todavía no está en la lista de Eucalipto. Puedes pedir que te den acceso.",
    pedirAcceso: "Pedir acceso",
  },
  otraCalle: {
    titulo: "Esta lista es solo para la calle Eucalipto",
    texto:
      "Por ahora esta lista es solo para la calle Eucalipto. Si tu calle quiere usarla, puede pedirlo a la administración.",
    soyDeEucalipto: "Vivo en Eucalipto: entrar con mi teléfono",
    pedirExcepcion: "Pedir una excepción",
    demo: 'En el demo, cambia de perfil arriba, en "Ver como".',
  },
  excepcion: {
    titulo: "Pide una excepción",
    ayuda:
      "Escribe tu teléfono y tu calle y número. Los coordinadores de Eucalipto revisarán tu solicitud.",
    casaEtiqueta: "Calle y número",
    casaAyuda: "Por ejemplo: Eucalipto 40",
    casaVacia: "Escribe tu calle y número.",
    enviar: "Enviar solicitud",
    calleNoParticipa:
      "Por ahora esta lista es solo para la calle Eucalipto. Si tu calle quiere usarla, puede pedirlo a la administración.",
  },
  enviada: {
    titulo: "Solicitud enviada",
    texto:
      "Listo. Tu solicitud está con los coordinadores de Eucalipto. Te avisarán por el chat de la calle.",
    demo: 'En el demo, cambia de perfil arriba, en "Ver como".',
  },
  errorGeneral: "Algo no salió como esperábamos. ¿Lo intentas otra vez?",
} as const;
