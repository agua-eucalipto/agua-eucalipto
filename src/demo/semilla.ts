import type { Api, ApiDemo, PerfilDemo, Resultado } from "../api/contrato";
import { HORA_MS } from "../dominio";
import { ahora, fijar, reiniciar } from "../reloj";

/**
 * Datos de ejemplo del demo. No se escribe ningún estado a mano: es un guion
 * de operaciones que corre por la `Api` con el reloj fijado en el pasado
 * (`T0 − 240 h` en adelante), de modo que cada dato cumple las reglas por
 * construcción y la bitácora sale coherente. Al terminar, el reloj vuelve a
 * correr en tiempo real y `T0` es "ahora".
 *
 * Todo es ficticio: casas Eucalipto 1 a 25, teléfonos `55 0000 00NN`.
 */

type ApiSemilla = Api & ApiDemo;

const PIN = "1234";

/** Instante en horas relativas a `T0` (negativo = en el pasado). */
type Horas = number;

interface Contexto {
  api: ApiSemilla;
  /** Id de cada folio registrado, por código. */
  folios: Map<string, string>;
  /** Id de cada viaje abierto, por proveedor. */
  viajes: Map<string, string>;
}

interface Paso {
  horas: Horas;
  /** Casa que opera; `null` para quien no tiene sesión. */
  casa: string | null;
  descripcion: string;
  ejecutar(contexto: Contexto): Promise<Resultado<unknown>>;
}

function telefonoDe(casa: string): string {
  return `55000000${casa.padStart(2, "0")}`;
}

function folioId(contexto: Contexto, codigo: string): string {
  const id = contexto.folios.get(codigo);
  if (id === undefined) {
    throw new Error(`semilla: el folio ${codigo} no se ha registrado`);
  }
  return id;
}

function viajeId(contexto: Contexto, proveedor: string): string {
  const id = contexto.viajes.get(proveedor);
  if (id === undefined) {
    throw new Error(`semilla: el viaje ${proveedor} no se ha abierto`);
  }
  return id;
}

function registrar(
  horas: Horas,
  casa: string,
  codigo: string,
  reemplaza?: string,
): Paso {
  return {
    horas,
    casa,
    descripcion: `casa ${casa} registra ${codigo}`,
    async ejecutar(contexto) {
      const r = await contexto.api.registrar_folio(
        codigo,
        reemplaza === undefined ? undefined : folioId(contexto, reemplaza),
      );
      if (r.ok) {
        contexto.folios.set(codigo, r.datos.id);
      }
      return r;
    },
  };
}

function surtir(horas: Horas, casa: string, codigo: string): Paso {
  return {
    horas,
    casa,
    descripcion: `casa ${casa} marca surtido ${codigo}`,
    ejecutar: (c) => c.api.marcar_surtido(folioId(c, codigo), false),
  };
}

function abrir(
  horas: Horas,
  casa: string,
  proveedor: string,
  extra: { precio_por_casa?: number; capacidad_aprox?: number } = {},
): Paso {
  return {
    horas,
    casa,
    descripcion: `casa ${casa} abre ${proveedor}`,
    async ejecutar(contexto) {
      const r = await contexto.api.abrir_viaje({
        proveedor,
        ...extra,
        acepta_responsabilidad: true,
      });
      if (r.ok) {
        contexto.viajes.set(proveedor, r.datos.id);
      }
      return r;
    },
  };
}

function anotarse(horas: Horas, casa: string, proveedor: string): Paso {
  return {
    horas,
    casa,
    descripcion: `casa ${casa} se anota en ${proveedor}`,
    ejecutar: (c) => c.api.anotarse(viajeId(c, proveedor)),
  };
}

function sobreViaje(
  horas: Horas,
  casa: string,
  proveedor: string,
  descripcion: string,
  operacion: (api: ApiSemilla, id: string) => Promise<Resultado<unknown>>,
): Paso {
  return {
    horas,
    casa,
    descripcion: `casa ${casa} ${descripcion} en ${proveedor}`,
    ejecutar: (c) => operacion(c.api, viajeId(c, proveedor)),
  };
}

/** Folios de ejemplo (08, "Folios"), en el momento en que se registran. */
const PASOS_FOLIOS: Paso[] = [
  registrar(-240, "7", "SIAPAZAP20260900"),
  surtir(-200, "7", "SIAPAZAP20260900"),
  registrar(-150, "21", "116244900"),
  registrar(-100, "7", "SIAPAZAP20260950"),
  registrar(-90, "7", "116244000"),
  registrar(-80, "4", "SIAPAZAP20260980"),
  registrar(-70, "22", "SIAPAZAP20260990"),
  registrar(-60, "3", "116245010"),
  registrar(-50, "7", "SIAPAZAP20261001"),
  registrar(-45, "12", "116245030"),
  registrar(-40, "15", "SIAPAZAP20261030"),
  surtir(-30, "22", "SIAPAZAP20260990"),
  registrar(-30, "12", "SIAPAZAP20261020"),
  {
    horas: -30,
    casa: "7",
    descripcion: "casa 7 marca que SIAPAZAP20260950 sigue pendiente",
    ejecutar: (c) =>
      c.api.marcar_sigue_pendiente(folioId(c, "SIAPAZAP20260950")),
  },
  registrar(-26, "7", "116245001", "116244000"),
  registrar(-10, "3", "SIAPAZAP20261010"),
  registrar(-5, "9", "116245020"),
  {
    horas: -20,
    casa: "3",
    descripcion: "la casa 3, coordinadora, envía la lista a caseta",
    ejecutar: (c) =>
      c.api.generar_lista_caseta({
        canal: true,
        dias: true,
        formato: "whatsapp",
      }),
  },
];

/** Rubén 2: abierto en −60 h, pasó en −46 h; queda una casa sin marcar. */
const PASOS_RUBEN_2: Paso[] = [
  abrir(-60, "22", "Rubén 2", { precio_por_casa: 150 }),
  anotarse(-60, "4", "Rubén 2"),
  anotarse(-59, "15", "Rubén 2"),
  anotarse(-58, "21", "Rubén 2"),
  anotarse(-57, "13", "Rubén 2"),
  anotarse(-56, "9", "Rubén 2"),
  sobreViaje(-50, "22", "Rubén 2", "marca pedida", (api, id) =>
    api.marcar_pedida(id, "mañana por la tarde"),
  ),
  sobreViaje(-46, "22", "Rubén 2", "marca que ya pasó", (api, id) =>
    api.marcar_ya_paso(id),
  ),
  sobreViaje(-44, "22", "Rubén 2", "confirma que le surtieron", (api, id) =>
    api.confirmar_entrega(id, "surtio"),
  ),
  sobreViaje(-43, "15", "Rubén 2", "confirma que le surtieron", (api, id) =>
    api.confirmar_entrega(id, "surtio"),
  ),
  sobreViaje(-42, "21", "Rubén 2", "confirma que le surtieron", (api, id) =>
    api.confirmar_entrega(id, "surtio"),
  ),
  sobreViaje(-35, "13", "Rubén 2", "confirma que sigue pendiente", (api, id) =>
    api.confirmar_entrega(id, "pendiente"),
  ),
];

/** Don Beto: pedida en −1 h con 8 anotadas y capacidad 6; la casa 2 se baja. */
const PASOS_DON_BETO: Paso[] = [
  abrir(-40, "19", "Don Beto", { capacidad_aprox: 6 }),
  anotarse(-39, "20", "Don Beto"),
  anotarse(-38, "23", "Don Beto"),
  anotarse(-37, "24", "Don Beto"),
  anotarse(-36.5, "25", "Don Beto"),
  anotarse(-36, "1", "Don Beto"),
  anotarse(-35.5, "17", "Don Beto"),
  anotarse(-34, "2", "Don Beto"),
  sobreViaje(-1, "19", "Don Beto", "marca pedida", (api, id) =>
    api.marcar_pedida(id, "en ~2 h"),
  ),
  sobreViaje(-0.5, "2", "Don Beto", "se da de baja", (api, id) =>
    api.dar_de_baja(id),
  ),
];

/** Pipas El Pozo: abre en −30 h y recoge a la casa 13 de la espera. */
const PASOS_EL_POZO: Paso[] = [
  abrir(-30, "5", "Pipas El Pozo"),
  anotarse(-29, "6", "Pipas El Pozo"),
  anotarse(-28.5, "8", "Pipas El Pozo"),
  anotarse(-28, "10", "Pipas El Pozo"),
  anotarse(-27.5, "11", "Pipas El Pozo"),
  // Última actividad del responsable: hace 26 h.
  sobreViaje(-26, "5", "Pipas El Pozo", "pone el precio", (api, id) =>
    api.editar_viaje(id, { precio_por_casa: 180 }),
  ),
];

/** Rubén 1: abre en −20 h; el responsable lo tocó por última vez hace 2 h. */
const PASOS_RUBEN_1: Paso[] = [
  abrir(-20, "12", "Rubén 1", { precio_por_casa: 150 }),
  // Debe ir después de abrir "Rubén 1": de lo contrario entraría a ese viaje.
  sobreViaje(-20, "4", "Rubén 2", "confirma que sigue pendiente", (api, id) =>
    api.confirmar_entrega(id, "pendiente"),
  ),
  anotarse(-15, "14", "Rubén 1"),
  anotarse(-10, "16", "Rubén 1"),
  sobreViaje(-2, "12", "Rubén 1", "pone la capacidad", (api, id) =>
    api.editar_viaje(id, { capacidad_aprox: 8 }),
  ),
];

const PASOS_SOLICITUDES: Paso[] = [
  {
    horas: -3,
    casa: null,
    descripcion: "pide acceso Naranjo 8",
    ejecutar: (c) =>
      c.api.solicitar_acceso(
        "55 0000 0099",
        "Naranjo 8",
        "casa_fuera_de_catalogo",
      ),
  },
  {
    horas: -2.5,
    casa: null,
    descripcion: "pide acceso un teléfono fuera de lista",
    ejecutar: (c) =>
      c.api.solicitar_acceso(
        "55 0000 0098",
        "Eucalipto 10",
        "telefono_fuera_de_lista",
      ),
  },
];

/** Guion completo, en el orden en que debe ocurrir. */
export function guionSemilla(): Paso[] {
  // `sort` es estable: a igual hora se conserva el orden en que se declaró.
  const pasos = [
    ...PASOS_FOLIOS,
    ...PASOS_RUBEN_2,
    ...PASOS_DON_BETO,
    ...PASOS_EL_POZO,
    ...PASOS_RUBEN_1,
    ...PASOS_SOLICITUDES,
  ];
  return pasos.sort((a, b) => a.horas - b.horas);
}

async function cambiarSesion(
  api: ApiSemilla,
  casa: string | null,
): Promise<void> {
  const r: Resultado<unknown> =
    casa === null
      ? await api.demo_ver_como("otra_calle" satisfies PerfilDemo)
      : await api.ingresar(telefonoDe(casa), PIN, casa);
  if (!r.ok) {
    throw new Error(
      `semilla: no se pudo abrir la sesión de ${casa}: ${r.error}`,
    );
  }
}

/**
 * Carga los datos de ejemplo sobre una `Api` recién creada (sin folios ni
 * viajes). Lanza si alguna operación del guion rompe una regla. Al terminar
 * deja la sesión vacía y el reloj corriendo en tiempo real.
 */
export async function sembrar(api: ApiSemilla): Promise<void> {
  const t0 = ahora();
  const contexto: Contexto = { api, folios: new Map(), viajes: new Map() };
  try {
    for (const paso of guionSemilla()) {
      fijar(t0 + paso.horas * HORA_MS);
      await cambiarSesion(api, paso.casa);
      const r = await paso.ejecutar(contexto);
      if (!r.ok) {
        throw new Error(
          `semilla: ${paso.descripcion} (${paso.horas} h) falló: ${r.error}${
            r.detalle === undefined ? "" : ` · ${r.detalle}`
          }`,
        );
      }
    }
    fijar(t0);
    await cambiarSesion(api, null);
  } finally {
    reiniciar();
  }
}
