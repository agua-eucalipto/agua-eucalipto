import type {
  Api,
  ApiDemo,
  EsperaVista,
  EventoVista,
  FolioVista,
  ListaCaseta,
  Resultado,
  ResultadoAnotarseCualquiera,
  Sesion,
  SolicitudAcceso,
  SolicitudAccesoEnviada,
  TelefonoVista,
  ViajeVista,
} from "./contrato";

/**
 * Implementación falsa para construir pantallas antes de tener el adaptador
 * real. Ignora sus argumentos y siempre responde lo mismo: no aplica ninguna
 * regla ni guarda estado. Todos los datos son ficticios.
 */

const INSTANTE = Date.UTC(2000, 0, 1, 16, 0);
const HORA = 60 * 60 * 1000;
const CASA = "0";

function exito<T>(datos: T): Promise<Resultado<T>> {
  return Promise.resolve({ ok: true, datos });
}

function sesion(): Sesion {
  return { casa: CASA, rol: "vecino" };
}

function folio(): FolioVista {
  return {
    id: "folio-de-prueba",
    codigo: "SIAPAZAP0000",
    canal: "whatsapp",
    casa_numero: CASA,
    registrado_at: INSTANTE,
    extendido_at: null,
    cierre: null,
    cerrado_at: null,
    reemplazado_por: null,
    estado: "activo",
    vence_at: INSTANTE + 72 * HORA,
    dias_que_lleva: 0,
    puede_extender: true,
    ultimo_envio_caseta_at: null,
  };
}

function viaje(): ViajeVista {
  return {
    id: "viaje-de-prueba",
    proveedor: "Proveedor de prueba",
    precio_por_casa: null,
    minimo_casas: 5,
    capacidad_aprox: null,
    responsable_casa: CASA,
    abierto_at: INSTANTE,
    pedido_at: null,
    eta_texto: null,
    paso_at: null,
    cerrado_sin_completar_at: null,
    estado: "juntando",
    anotadas: 1,
    anotaciones: [
      {
        id: "anotacion-de-prueba",
        casa_numero: CASA,
        antiguedad_desde: INSTANTE,
        con_prioridad: false,
        anotada_at: INSTANTE,
        estado: "anotada",
        estado_at: INSTANTE,
        sin_confirmar: false,
        excede_capacidad: false,
      },
    ],
    puede_que_no_alcance: false,
    responsable_inactivo: false,
    soy_responsable: true,
    estoy_anotado: true,
  };
}

function espera(): EsperaVista {
  return {
    casa_numero: "00",
    antiguedad_desde: INSTANTE,
    con_prioridad: false,
    origen: "me_da_igual",
    creada_at: INSTANTE,
  };
}

function solicitud(): SolicitudAcceso {
  return {
    id: "solicitud-de-prueba",
    telefono: "5500000000",
    casa_texto: "Calle de prueba 0",
    motivo: "casa_fuera_de_catalogo",
    estado: "pendiente",
    creada_at: INSTANTE,
    resuelta_at: null,
    resuelta_por: null,
  };
}

function solicitudEnviada(): SolicitudAccesoEnviada {
  return {
    id: "solicitud-de-prueba",
    casa_texto: "Calle de prueba 0",
    motivo: "casa_fuera_de_catalogo",
    estado: "pendiente",
    creada_at: INSTANTE,
    resuelta_at: null,
  };
}

function listaCaseta(): ListaCaseta {
  return {
    envio_id: "envio-de-prueba",
    generada_at: INSTANTE,
    opciones: { canal: false, dias: false, formato: "imprimir" },
    filas: [
      {
        casa_numero: CASA,
        folios: [
          { codigo: "SIAPAZAP0000", canal: "whatsapp", dias_que_lleva: 0 },
        ],
      },
    ],
    total_casas: 1,
    total_folios: 1,
  };
}

function telefono(): TelefonoVista {
  return {
    numero: "5500000000",
    casa_numero: CASA,
    en_lista_blanca: true,
    es_coordinador: false,
    tiene_pin: true,
    bloqueado_hasta: null,
    reiniciado_at: null,
  };
}

function evento(): EventoVista {
  return {
    id: 1,
    ocurrido_at: INSTANTE,
    casa_numero: CASA,
    rol: "vecino",
    tipo: "folio_registrado",
    detalle: { folio: "SIAPAZAP••••0000", canal: "whatsapp" },
  };
}

export class ApiFalsa implements Api, ApiDemo {
  sesion_actual() {
    return exito(sesion());
  }

  ingresar() {
    return exito(sesion());
  }

  solicitar_acceso() {
    return exito(solicitudEnviada());
  }

  listar_folios_casa() {
    return exito([folio()]);
  }

  registrar_folio() {
    return exito(folio());
  }

  marcar_sigue_pendiente() {
    return exito(folio());
  }

  marcar_surtido() {
    return exito([folio()]);
  }

  listar_viajes() {
    return exito([viaje()]);
  }

  listar_espera() {
    return exito([espera()]);
  }

  abrir_viaje() {
    return exito(viaje());
  }

  editar_viaje() {
    return exito(viaje());
  }

  anotarse() {
    return exito(viaje());
  }

  anotarse_cualquiera() {
    return exito<ResultadoAnotarseCualquiera>({ viaje: viaje() });
  }

  dar_de_baja() {
    return exito(viaje());
  }

  marcar_pedida() {
    return exito(viaje());
  }

  marcar_ya_paso() {
    return exito(viaje());
  }

  confirmar_entrega() {
    return exito(viaje());
  }

  tomar_responsabilidad() {
    return exito(viaje());
  }

  cancelar_viaje() {
    return exito(undefined);
  }

  salir_de_espera() {
    return exito(undefined);
  }

  generar_lista_caseta() {
    return exito(listaCaseta());
  }

  listar_solicitudes() {
    return exito([solicitud()]);
  }

  resolver_solicitud() {
    return exito(solicitud());
  }

  listar_telefonos() {
    return exito([telefono()]);
  }

  reiniciar_telefono() {
    return exito(undefined);
  }

  bitacora() {
    return exito([evento()]);
  }

  demo_ver_como() {
    return exito(sesion());
  }

  demo_adelantar_reloj() {
    return exito({ ahora: INSTANTE });
  }

  demo_reiniciar() {
    return exito(undefined);
  }
}
