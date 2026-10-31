import { expect } from "vitest";
import type { Api } from "../../src/api/contrato";
import { escenario } from "./escenario";
import {
  CALLE_EXCEPCION,
  METODOS_API,
  METODOS_DEMO,
  telefonoDe,
} from "./mundo";
import {
  HORA,
  MIN,
  abrir,
  anotar,
  bitacoraCompleta,
  buscarTelefonos,
  conEventos,
  confirmar,
  eventosDespues,
  foliosDe,
  instantanea,
  ok,
  pasar,
  pedir,
  rechaza,
  registrar,
  tel,
  tipos,
  ultimoEventoId,
  variantesDeTelefono,
  wa,
} from "./utiles";

escenario(
  "G-INV-1 · el estado solo cambia por la Api: modificar lo devuelto no altera lo guardado",
  async (c) => {
    const { api, como } = c;
    const folio = await registrar(c, "7", wa(1));
    const viaje = await abrir(c, "12");
    const antes = await instantanea(c, ["7", "12"]);

    const folios = await foliosDe(c, "7");
    Object.assign(folio, { codigo: "OTRO", estado: "surtido" });
    for (const f of folios) {
      f.codigo = "OTRO";
      f.estado = "surtido";
    }
    folios.push({ ...folio, id: "inventado" });
    await como("12");
    const viajes = ok(await api.listar_viajes(), "listar viajes");
    for (const v of viajes) {
      v.proveedor = "Alterado";
      v.anotaciones.length = 0;
    }
    Object.assign(viaje, { proveedor: "Alterado" });
    const eventos = ok(await api.bitacora(), "bitácora");
    for (const e of eventos) {
      e.detalle = { alterado: true };
    }
    eventos.length = 0;

    expect(await instantanea(c, ["7", "12"])).toEqual(antes);
  },
);

escenario("G-INV-1 · leer no escribe", async (c) => {
  const { api, como } = c;
  await registrar(c, "7", wa(1));
  const v = await abrir(c, "12");
  const desde = await ultimoEventoId(api);
  for (const casa of ["7", "12", "coordinador"]) {
    await como(casa);
    await api.sesion_actual();
    await api.listar_folios_casa();
    await api.listar_viajes();
    await api.listar_espera();
    await api.bitacora();
    if (casa === "coordinador") {
      await api.listar_solicitudes();
      await api.listar_telefonos();
    }
  }
  expect(await eventosDespues(api, desde)).toEqual([]);
  expect(v.id).toBeDefined();
});

escenario(
  "G-INV-2 · una operación rechazada no cambia estado ni agrega eventos",
  async (c) => {
    const { api, como } = c;
    const a = await registrar(c, "7", wa(1));
    await registrar(c, "7", wa(2));
    await registrar(c, "7", tel(1));
    const ajeno = await registrar(c, "8", wa(10));
    const v1 = await abrir(c, "12");
    await anotar(c, "14", v1.id);
    await anotar(c, "16", v1.id);
    const v2 = await abrir(c, "20");
    const antes = await instantanea(c, ["7", "8", "12", "14", "20", "22"]);

    const intentos: [
      string,
      () => Promise<unknown>,
      Parameters<typeof rechaza>[1],
    ][] = [];
    const como_ =
      (casa: string, f: (api: Api) => Promise<unknown>) => async () => {
        await como(casa);
        return f(api);
      };
    intentos.push(
      [
        "folio repetido",
        como_("7", (x) => x.registrar_folio(a.codigo)),
        "FOLIO_YA_USADO",
      ],
      [
        "formato inválido",
        como_("7", (x) => x.registrar_folio("XYZ")),
        "FOLIO_FORMATO_INVALIDO",
      ],
      [
        "tope del canal",
        como_("7", (x) => x.registrar_folio(wa(3))),
        "TOPE_CANAL",
      ],
      [
        "reemplazo ajeno",
        como_("7", (x) => x.registrar_folio(wa(3), ajeno.id)),
        "REEMPLAZO_INVALIDO",
      ],
      [
        "sigue pendiente inexistente",
        como_("7", (x) => x.marcar_sigue_pendiente("no-existe")),
        "NO_ENCONTRADO",
      ],
      [
        "me surtieron inexistente",
        como_("7", (x) => x.marcar_surtido("no-existe", true)),
        "NO_ENCONTRADO",
      ],
      [
        "pedir sin ser responsable",
        como_("14", (x) => x.marcar_pedida(v1.id, "x")),
        "NO_ES_RESPONSABLE",
      ],
      [
        "pedir sin llegar al mínimo",
        como_("20", (x) => x.marcar_pedida(v2.id, "x")),
        "NO_ESTA_LISTA",
      ],
      [
        "anotarse estando en otro viaje",
        como_("14", (x) => x.anotarse(v2.id)),
        "YA_EN_VIAJE",
      ],
      [
        "abrir sin aceptar",
        como_("22", (x) =>
          x.abrir_viaje({
            proveedor: "Z",
            acepta_responsabilidad: false as unknown as true,
          }),
        ),
        "FALTA_ACEPTAR",
      ],
      [
        "baja del responsable",
        como_("12", (x) => x.dar_de_baja(v1.id)),
        "ES_RESPONSABLE",
      ],
      [
        "lista de caseta de vecino",
        como_("7", (x) =>
          x.generar_lista_caseta({
            canal: true,
            dias: true,
            formato: "imprimir",
          }),
        ),
        "NO_AUTORIZADO",
      ],
      [
        "cancelar sin ser responsable",
        como_("7", (x) => x.cancelar_viaje(v1.id)),
        "NO_ES_RESPONSABLE",
      ],
      [
        "confirmar antes de que pase",
        como_("14", (x) => x.confirmar_entrega(v1.id, "surtio")),
        "NO_HA_PASADO",
      ],
      [
        "salir de una espera sin estar",
        como_("22", (x) => x.salir_de_espera()),
        "NO_EN_ESPERA",
      ],
      [
        "editar sin ser responsable",
        como_("7", (x) => x.editar_viaje(v1.id, { proveedor: "x" })),
        "NO_ES_RESPONSABLE",
      ],
      [
        "solicitud inexistente",
        como_("coordinador", (x) => x.resolver_solicitud("no-existe", true)),
        "NO_ENCONTRADO",
      ],
      [
        "teléfono inexistente",
        como_("coordinador", (x) => x.reiniciar_telefono("5500000077")),
        "NO_ENCONTRADO",
      ],
    );
    for (const [que, intento, codigo] of intentos) {
      rechaza((await intento()) as Parameters<typeof rechaza>[0], codigo, que);
    }
    expect(await instantanea(c, ["7", "8", "12", "14", "20", "22"])).toEqual(
      antes,
    );
  },
);

escenario("G-INV-2 · una escritura exitosa deja sus eventos", async (c) => {
  const { api, como, reloj } = c;
  await como("7");
  const por = async (accion: () => Promise<unknown>) => {
    const eventos = await conEventos(api, accion);
    for (const e of eventos) {
      expect(e.ocurrido_at).toBe(reloj.ahora());
    }
    return eventos;
  };

  const primero = await registrar(c, "7", wa(1));
  let folio = primero;
  expect(
    tipos(
      await por(async () => {
        folio = await registrar(c, "7", wa(2));
      }),
    ),
  ).toEqual(["folio_registrado"]);
  expect(
    tipos(
      await por(async () => {
        await registrar(c, "7", wa(3), primero.id);
      }),
    ),
  ).toEqual(["folio_reemplazado", "folio_registrado"]);
  await como("7");
  expect(
    tipos(
      await por(async () => {
        ok(await api.marcar_sigue_pendiente(folio.id), "sigue");
      }),
    ),
  ).toEqual(["folio_extendido"]);
  expect(
    tipos(
      await por(async () => {
        ok(await api.marcar_surtido(folio.id, false), "surtido");
      }),
    ),
  ).toEqual(["folio_surtido"]);

  const v = await abrir(c, "12", { minimo_casas: 2 });
  expect(
    tipos(
      await por(async () => {
        await anotar(c, "14", v.id);
      }),
    ),
  ).toContain("anotado");
  await como("12");
  expect(
    tipos(
      await por(async () => {
        ok(await api.editar_viaje(v.id, { proveedor: "Nuevo" }), "editar");
      }),
    ),
  ).toEqual(["viaje_editado"]);
  expect(
    tipos(
      await por(async () => {
        await pedir(c, "12", v.id);
      }),
    ),
  ).toContain("viaje_pedido");
  expect(
    tipos(
      await por(async () => {
        await pasar(c, "12", v.id);
      }),
    ),
  ).toContain("viaje_paso");
  expect(
    tipos(
      await por(async () => {
        await confirmar(c, "14", v.id, "surtio");
      }),
    ),
  ).toContain("entrega_confirmada");

  await como("coordinador");
  expect(
    tipos(
      await por(async () => {
        ok(
          await api.generar_lista_caseta({
            canal: false,
            dias: false,
            formato: "whatsapp",
          }),
          "lista",
        );
      }),
    ),
  ).toEqual(["lista_caseta_generada"]);
  expect(
    tipos(
      await por(async () => {
        ok(
          await api.solicitar_acceso(
            "5500000090",
            "Eucalipto 10",
            "telefono_fuera_de_lista",
          ),
          "solicitud",
        );
      }),
    ),
  ).toContain("solicitud_creada");
});

escenario(
  "G-INV-3 · la bitácora solo crece: lo anterior no cambia y los ids suben",
  async (c) => {
    const { api } = c;
    const folio = await registrar(c, "7", wa(1));
    await registrar(c, "8", tel(1));
    const antes = await bitacoraCompleta(api);
    expect(antes.length).toBeGreaterThan(0);

    await c.reloj.adelantar(HORA);
    await c.como("7");
    ok(await api.marcar_surtido(folio.id, false), "surtir");
    await abrir(c, "12");
    const despues = await bitacoraCompleta(api);

    expect(despues.slice(0, antes.length)).toEqual(antes);
    expect(despues.length).toBeGreaterThan(antes.length);
    const ids = despues.map((e) => e.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of despues) {
      e.detalle = { alterado: true };
    }
    expect(await bitacoraCompleta(api)).not.toEqual(despues);
  },
);

escenario(
  "G-INV-3 · la bitácora se lee del más reciente al más antiguo, por páginas",
  async (c) => {
    const { api, como } = c;
    for (let i = 1; i <= 30; i += 1) {
      const folio = await registrar(c, "7", wa(i));
      await como("7");
      ok(await api.marcar_surtido(folio.id, false), "surtir");
    }
    const primera = ok(await api.bitacora(), "primera página");
    expect(primera).toHaveLength(50);
    const ids = primera.map((e) => e.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));

    const segunda = ok(
      await api.bitacora(ids[ids.length - 1], 50),
      "segunda página",
    );
    expect(segunda.length).toBeGreaterThan(0);
    expect(Math.max(...segunda.map((e) => e.id))).toBeLessThan(
      Math.min(...ids),
    );
    expect(ok(await api.bitacora(undefined, 5), "límite")).toHaveLength(5);
    const todos = await bitacoraCompleta(api);
    expect(todos.length).toBe(60);
  },
);

escenario(
  "G-INV-4 · cualquier lectura barre y repetir el barrido no cambia nada",
  async (c) => {
    const { api, como, reloj } = c;
    const v = await abrir(c, "12", { minimo_casas: 5 });
    await anotar(c, "14", v.id);
    await reloj.adelantar(72 * HORA - MIN);
    await como("20");
    expect(await bitacoraCompleta(api)).not.toContainEqual(
      expect.objectContaining({ tipo: "viaje_cerrado_72h" }),
    );

    await reloj.adelantar(MIN);
    const primera = ok(await api.bitacora(), "primera lectura");
    expect(primera.filter((e) => e.tipo === "viaje_cerrado_72h")).toHaveLength(
      1,
    );
    const antes = await instantanea(c, ["20"]);

    await como("20");
    ok(await api.listar_viajes(), "listar viajes");
    ok(await api.listar_espera(), "listar espera");
    ok(await api.bitacora(), "otra lectura");
    const despues = await instantanea(c, ["20"]);
    expect(despues).toEqual(antes);
    expect(
      despues.bitacora.filter((e) => e.tipo === "viaje_cerrado_72h"),
    ).toHaveLength(1);
    const espera = ok(await api.listar_espera(), "espera");
    expect(espera.map((e) => e.casa_numero).sort()).toEqual(["12", "14"]);
  },
);

escenario(
  "G-INV-5 · ninguna respuesta a un vecino contiene teléfonos",
  async (c) => {
    const { api, como } = c;
    // Controles del detector: un uuid con 10 dígitos no es un teléfono; uno de verdad sí.
    const uuidConDiez = "123e4567-e89b-12d3-a456-446655440000";
    expect(
      buscarTelefonos({
        id: uuidConDiez,
        viaje_id: "1234567890",
        otro: uuidConDiez,
      }),
      "los identificadores no se marcan",
    ).toEqual([]);
    expect(
      buscarTelefonos({ detalle: { texto: telefonoDe("7") } }),
    ).toHaveLength(1);
    expect(buscarTelefonos({ telefono: null })).toHaveLength(1);

    const respuestas: [string, unknown][] = [];
    const guardar = (que: string, r: unknown) => respuestas.push([que, r]);

    guardar(
      "solicitar_acceso",
      await api.solicitar_acceso(
        telefonoDe("9"),
        `${CALLE_EXCEPCION} 8`,
        "casa_fuera_de_catalogo",
      ),
    );
    await como("coordinador");
    const solicitudes = ok(
      await api.listar_solicitudes(),
      "listar solicitudes",
    );
    for (const s of solicitudes) {
      ok(await api.resolver_solicitud(s.id, false), "resolver");
    }
    ok(await api.reiniciar_telefono(telefonoDe("15")), "reiniciar");
    ok(
      await api.generar_lista_caseta({
        canal: true,
        dias: true,
        formato: "whatsapp",
      }),
      "lista",
    );

    await como("7");
    const folio = ok(await api.registrar_folio(wa(1)), "registrar");
    guardar("registrar_folio", { ok: true, datos: folio });
    guardar("sesion_actual", await api.sesion_actual());
    guardar("listar_folios_casa", await api.listar_folios_casa());
    guardar(
      "marcar_sigue_pendiente",
      await api.marcar_sigue_pendiente(folio.id),
    );
    const viaje = ok(
      await api.abrir_viaje({
        proveedor: "Rubén",
        acepta_responsabilidad: true,
      }),
      "abrir",
    );
    guardar("abrir_viaje", { ok: true, datos: viaje });
    await anotar(c, "12", viaje.id);
    await como("12");
    guardar("anotarse", await api.anotarse_cualquiera());
    await como("7");
    guardar("listar_viajes", await api.listar_viajes());
    guardar("listar_espera", await api.listar_espera());
    guardar("marcar_surtido", await api.marcar_surtido(folio.id, true));
    guardar("bitacora", await api.bitacora(undefined, 500));

    const hallazgos: string[] = [];
    for (const [que, respuesta] of respuestas) {
      const texto = JSON.stringify(respuesta);
      for (const casa of ["7", "9", "12", "15", "3"]) {
        for (const variante of variantesDeTelefono(casa)) {
          if (texto.includes(variante)) {
            hallazgos.push(`${que}: contiene ${variante}`);
          }
        }
      }
      hallazgos.push(
        ...buscarTelefonos(respuesta).map((ruta) => `${que}: ${ruta}`),
      );
    }
    expect(hallazgos, "teléfonos en respuestas de vecino").toEqual([]);
  },
);

escenario(
  "G-INV-6 · los coordinadores no tienen sanciones, prioridades ni asignaciones",
  async (c) => {
    const { api, como } = c;
    const permitidos = new Set<string>([...METODOS_API, ...METODOS_DEMO]);
    const publicos = new Set<string>();
    for (
      let o: object | null = api;
      o !== null && o !== Object.prototype;
      o = Object.getPrototypeOf(o)
    ) {
      for (const nombre of Object.getOwnPropertyNames(o)) {
        if (
          nombre !== "constructor" &&
          !nombre.startsWith("_") &&
          typeof (api as unknown as Record<string, unknown>)[nombre] ===
            "function"
        ) {
          publicos.add(nombre);
        }
      }
    }
    for (const metodo of METODOS_API) {
      expect(publicos.has(metodo), `la Api debe tener ${metodo}`).toBe(true);
    }
    const sospechosos = [...publicos].filter(
      (m) =>
        !permitidos.has(m) &&
        /sanci|multa|priori|asign|expuls|bloquear|mover|borrar|eliminar|quitar/i.test(
          m,
        ),
    );
    expect(sospechosos, "operaciones que no existen en el contrato").toEqual(
      [],
    );

    const v = await abrir(c, "12", { minimo_casas: 3 });
    await anotar(c, "14", v.id);
    await anotar(c, "16", v.id);
    const folio = await registrar(c, "7", wa(1));
    const antes = await instantanea(c, ["7", "12"]);

    await como("coordinador");
    rechaza(
      await api.editar_viaje(v.id, { proveedor: "Impuesto" }),
      "NO_ES_RESPONSABLE",
      "editar viaje ajeno",
    );
    rechaza(
      await api.marcar_pedida(v.id, "ya"),
      "NO_ES_RESPONSABLE",
      "pedir viaje ajeno",
    );
    rechaza(
      await api.cancelar_viaje(v.id),
      "NO_ES_RESPONSABLE",
      "cancelar viaje ajeno",
    );
    rechaza(
      await api.dar_de_baja(v.id),
      "NO_ANOTADO",
      "dar de baja a otra casa",
    );
    rechaza(
      await api.marcar_surtido(folio.id, true),
      "NO_ENCONTRADO",
      "surtir folio ajeno",
    );
    const despues = await instantanea(c, ["7", "12"]);
    expect(despues.porCasa).toEqual(antes.porCasa);
  },
);
