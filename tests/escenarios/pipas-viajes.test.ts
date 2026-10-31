import { expect } from "vitest";
import type { DatosAbrirViaje } from "../../src/api/contrato";
import { escenario } from "./escenario";
import {
  HORA,
  MIN,
  abrir,
  anotacionDe,
  anotar,
  bitacoraCompleta,
  casasEnOrden,
  conEventos,
  dejarPendiente,
  espera,
  esperaDe,
  instantanea,
  ok,
  pasar,
  pedir,
  rechaza,
  tipos,
  ver,
} from "./utiles";

/** `acepta_responsabilidad` solo admite `true` en el tipo; así se prueba el rechazo. */
const sinAceptar = (datos: Omit<DatosAbrirViaje, "acepta_responsabilidad">) =>
  ({ ...datos, acepta_responsabilidad: false }) as unknown as DatosAbrirViaje;

escenario("P-01 · una casa está en a lo más un viaje activo", async (c) => {
  const { api, como } = c;
  const a = await abrir(c, "12");
  const b = await abrir(c, "14");
  await anotar(c, "16", a.id);
  await anotar(c, "17", a.id);

  await como("16");
  rechaza(await api.anotarse(b.id), "YA_EN_VIAJE", "anotarse en otro viaje");
  rechaza(
    await api.abrir_viaje({ proveedor: "Otro", acepta_responsabilidad: true }),
    "YA_EN_VIAJE",
    "abrir un viaje estando anotada",
  );
  await como("12");
  rechaza(
    await api.anotarse(b.id),
    "YA_EN_VIAJE",
    "el responsable en otro viaje",
  );

  await pedir(c, "12", a.id);
  await como("16");
  rechaza(await api.anotarse(b.id), "YA_EN_VIAJE", "con su viaje ya pedido");

  await pasar(c, "12", a.id);
  await anotar(c, "16", b.id);
  expect(casasEnOrden(await ver(c, b.id))).toContain("16");
});

escenario(
  "P-01 · anotarse desde la espera saca a la casa de la espera",
  async (c) => {
    const { api, como } = c;
    const x = await abrir(c, "12", { minimo_casas: 5 });
    await anotar(c, "4", x.id);
    const a = await abrir(c, "14", { minimo_casas: 5 });
    expect((await espera(c, "4")).map((e) => e.casa_numero)).toEqual([]);

    await como("12");
    ok(await api.cancelar_viaje(x.id), "cancelar el viaje de la casa 12");
    expect((await espera(c, "4")).map((e) => e.casa_numero).sort()).toEqual([
      "12",
      "4",
    ]);

    await anotar(c, "4", a.id);
    expect((await espera(c, "4")).map((e) => e.casa_numero)).toEqual(["12"]);
  },
);

escenario(
  "P-02 · abrir exige aceptar la responsabilidad y suma a toda la espera",
  async (c) => {
    const { api, como, reloj } = c;
    await como("12");
    rechaza(
      await api.abrir_viaje(sinAceptar({ proveedor: "Rubén 1" })),
      "FALTA_ACEPTAR",
      "abrir sin aceptar",
    );
    expect(ok(await api.listar_viajes(), "listar")).toEqual([]);

    const antiguedades: Record<string, number> = {};
    for (const casa of ["18", "19", "17"]) {
      await como(casa);
      const res = ok(await api.anotarse_cualquiera(), `me da igual (${casa})`);
      expect(
        res.espera,
        `la casa ${casa} debe quedar en la espera`,
      ).toBeDefined();
      antiguedades[casa] = res.espera?.antiguedad_desde ?? -1;
      await reloj.adelantar(HORA);
    }

    const viaje = await abrir(c, "12", { minimo_casas: 5 });
    expect(casasEnOrden(viaje)).toEqual(["18", "19", "17", "12"]);
    expect(viaje).toMatchObject({
      responsable_casa: "12",
      soy_responsable: true,
      estoy_anotado: true,
      estado: "juntando",
      anotadas: 4,
    });
    for (const casa of ["18", "19", "17"]) {
      expect(anotacionDe(viaje, casa)).toMatchObject({
        antiguedad_desde: antiguedades[casa],
        con_prioridad: false,
      });
    }
    expect(await espera(c, "12")).toEqual([]);
  },
);

escenario(
  "P-02 · quien abre desde la espera conserva su antigüedad",
  async (c) => {
    const { api, como, reloj } = c;
    await como("18");
    const entrada = ok(await api.anotarse_cualquiera(), "me da igual").espera;
    await reloj.adelantar(2 * HORA);
    const viaje = await abrir(c, "18", { minimo_casas: 5 });
    expect(viaje.anotadas).toBe(1);
    expect(anotacionDe(viaje, "18").antiguedad_desde).toBe(
      entrada?.antiguedad_desde,
    );
    expect(await espera(c, "18")).toEqual([]);
  },
);

escenario("P-02 · abrir viaje con datos inválidos se rechaza", async (c) => {
  const { api, como } = c;
  await como("12");
  const invalidos: [string, Omit<DatosAbrirViaje, "acepta_responsabilidad">][] =
    [
      ["proveedor vacío", { proveedor: "" }],
      ["proveedor de 41 caracteres", { proveedor: "x".repeat(41) }],
      ["mínimo 0", { proveedor: "Rubén", minimo_casas: 0 }],
      ["mínimo 31", { proveedor: "Rubén", minimo_casas: 31 }],
      [
        "capacidad menor que el mínimo",
        { proveedor: "Rubén", minimo_casas: 5, capacidad_aprox: 4 },
      ],
    ];
  for (const [que, datos] of invalidos) {
    rechaza(
      await api.abrir_viaje({ ...datos, acepta_responsabilidad: true }),
      "DATOS_INVALIDOS",
      que,
    );
  }
  expect(ok(await api.listar_viajes(), "listar")).toEqual([]);
});

escenario("P-03 · el orden es prioridad, luego antigüedad", async (c) => {
  const { api, como, reloj } = c;
  const inicio = reloj.ahora();
  const w = await abrir(c, "9", { minimo_casas: 5 });
  await reloj.adelantar(HORA);
  const { antiguedad } = await dejarPendiente(c, "5", "6");
  await reloj.adelantar(HORA);
  await como("9");
  ok(await api.cancelar_viaje(w.id), "cancelar el viaje de la casa 9");

  const enEspera = await espera(c, "9");
  expect(esperaDe(enEspera, "6")).toMatchObject({
    con_prioridad: true,
    antiguedad_desde: antiguedad,
  });
  expect(esperaDe(enEspera, "9")).toMatchObject({
    con_prioridad: false,
    antiguedad_desde: inicio,
  });

  await reloj.adelantar(HORA);
  const y = await abrir(c, "12", { minimo_casas: 5 });
  expect(casasEnOrden(y)).toEqual(["6", "9", "12"]);
  expect(anotacionDe(y, "6")).toMatchObject({
    con_prioridad: true,
    antiguedad_desde: antiguedad,
  });
  expect(anotacionDe(y, "9")).toMatchObject({
    con_prioridad: false,
    antiguedad_desde: inicio,
  });

  await reloj.adelantar(HORA);
  await anotar(c, "14", y.id);
  await reloj.adelantar(HORA);
  await anotar(c, "15", y.id);
  expect(casasEnOrden(await ver(c, y.id))).toEqual([
    "6",
    "9",
    "12",
    "14",
    "15",
  ]);
});

escenario(
  "P-03 · con la misma antigüedad gana quien se anotó antes",
  async (c) => {
    const { api, como, reloj } = c;
    const inicio = reloj.ahora();
    const z = await abrir(c, "12", { minimo_casas: 6 });
    const x = await abrir(c, "5", { minimo_casas: 5 });
    await anotar(c, "8", x.id);
    await anotar(c, "9", x.id);
    await reloj.adelantar(HORA);
    await como("5");
    ok(await api.cancelar_viaje(x.id), "cancelar el viaje de la casa 5");

    await reloj.adelantar(HORA);
    await anotar(c, "9", z.id);
    await reloj.adelantar(HORA);
    const lleno = await anotar(c, "8", z.id);
    expect(casasEnOrden(lleno)).toEqual(["12", "9", "8"]);
    expect(anotacionDe(lleno, "9").antiguedad_desde).toBe(inicio);
    expect(anotacionDe(lleno, "8").antiguedad_desde).toBe(inicio);
  },
);

escenario(
  "P-04 · lista al llegar al mínimo y regresa a juntando si bajan",
  async (c) => {
    const { api, como } = c;
    const v = await abrir(c, "12", { minimo_casas: 3 });
    expect(v.estado).toBe("juntando");
    await anotar(c, "14", v.id);
    expect((await anotar(c, "16", v.id)).estado).toBe("lista");

    await como("16");
    const baja = ok(await api.dar_de_baja(v.id), "baja");
    expect(baja).toMatchObject({ estado: "juntando", anotadas: 2 });
    expect((await anotar(c, "16", v.id)).estado).toBe("lista");

    const llegadas = (await bitacoraCompleta(api)).filter(
      (e) => e.tipo === "viaje_lista",
    );
    expect(
      llegadas,
      "el evento de lista se registra solo la primera vez",
    ).toHaveLength(1);
  },
);

escenario("P-05 · pedir es del responsable y solo desde lista", async (c) => {
  const { api, como } = c;
  const v = await abrir(c, "12", { minimo_casas: 3 });
  await anotar(c, "14", v.id);
  await como("12");
  rechaza(
    await api.marcar_pedida(v.id, "en ~2 h"),
    "NO_ESTA_LISTA",
    "desde juntando",
  );
  await anotar(c, "16", v.id);

  await como("14");
  rechaza(
    await api.marcar_pedida(v.id, "en ~2 h"),
    "NO_ES_RESPONSABLE",
    "otra casa",
  );

  const pedida = await pedir(c, "12", v.id, "en ~2 h");
  expect(pedida).toMatchObject({
    estado: "pedida",
    eta_texto: "en ~2 h",
    pedido_at: c.reloj.ahora(),
  });
  expect(
    ok(await api.listar_viajes(), "listar"),
    "no se abre otro viaje solo",
  ).toHaveLength(1);

  await como("20");
  rechaza(
    await api.anotarse(v.id),
    "VIAJE_CERRADO",
    "anotarse a un viaje pedido",
  );
  await como("12");
  rechaza(
    await api.marcar_pedida(v.id, "otra vez"),
    "NO_ESTA_LISTA",
    "pedir dos veces",
  );
  const siguiente = await abrir(c, "20");
  expect(siguiente.estado).toBe("juntando");
});

escenario(
  "P-06 · pasada la capacidad avisa y marca las filas que exceden",
  async (c) => {
    const { reloj } = c;
    const v = await abrir(c, "12", { minimo_casas: 3, capacidad_aprox: 6 });
    for (const casa of ["13", "14", "15", "16", "17"]) {
      await reloj.adelantar(MIN);
      await anotar(c, casa, v.id);
    }
    const seis = await ver(c, v.id);
    expect(seis.anotadas).toBe(6);
    expect(seis.puede_que_no_alcance, "con 6 de 6").toBe(false);
    expect(seis.anotaciones.some((a) => a.excede_capacidad)).toBe(false);

    await reloj.adelantar(MIN);
    await anotar(c, "18", v.id);
    const siete = await ver(c, v.id);
    expect(siete.puede_que_no_alcance, "con 7 de 6").toBe(true);
    expect(
      siete.anotaciones
        .filter((a) => a.excede_capacidad)
        .map((a) => a.casa_numero),
    ).toEqual(["18"]);

    await c.como("18");
    ok(await c.api.dar_de_baja(v.id), "baja de la 7.ª");
    expect((await ver(c, v.id)).puede_que_no_alcance).toBe(false);
  },
);

escenario(
  "P-07 · la baja es libre antes de pedir y queda visible después",
  async (c) => {
    const { api, como } = c;
    const v = await abrir(c, "12", { minimo_casas: 3 });
    await anotar(c, "14", v.id);
    await anotar(c, "16", v.id);

    await como("14");
    let enLista = v;
    const eventosBaja = await conEventos(api, async () => {
      enLista = ok(await api.dar_de_baja(v.id), "baja en lista");
    });
    expect(tipos(eventosBaja)).toContain("baja");
    expect(enLista).toMatchObject({ anotadas: 2, estoy_anotado: false });
    await anotar(c, "14", v.id);

    await como("12");
    rechaza(await api.dar_de_baja(v.id), "ES_RESPONSABLE", "el responsable");
    await como("20");
    rechaza(await api.dar_de_baja(v.id), "NO_ANOTADO", "quien no está anotada");

    await pedir(c, "12", v.id);
    await como("16");
    const eventos = await conEventos(api, async () => {
      ok(await api.dar_de_baja(v.id), "baja después de pedir");
    });
    expect(tipos(eventos)).toContain("baja_despues_de_pedida");

    const vista = await ver(c, v.id, "14");
    expect(vista.estado).toBe("pedida");
    expect(vista.anotadas).toBe(2);
    expect(anotacionDe(vista, "16").estado).toBe("baja_despues_de_pedida");

    const otro = await abrir(c, "20");
    await anotar(c, "16", otro.id);
  },
);

escenario("P-08 · ya pasó lo marca el responsable desde pedida", async (c) => {
  const { api, como } = c;
  const v = await abrir(c, "12", { minimo_casas: 3 });
  await anotar(c, "14", v.id);
  await anotar(c, "16", v.id);
  await como("12");
  rechaza(await api.marcar_ya_paso(v.id), "NO_ESTA_PEDIDA", "desde lista");
  await pedir(c, "12", v.id);

  await como("14");
  rechaza(await api.marcar_ya_paso(v.id), "NO_ES_RESPONSABLE", "otra casa");
  rechaza(
    await api.confirmar_entrega(v.id, "surtio"),
    "NO_HA_PASADO",
    "antes de que pase",
  );

  await como("12");
  const eventos = await conEventos(api, async () => {
    const paso = ok(await api.marcar_ya_paso(v.id), "ya pasó");
    expect(paso).toMatchObject({ estado: "ya_paso", paso_at: c.reloj.ahora() });
  });
  expect(tipos(eventos)).toContain("viaje_paso");
  rechaza(await api.marcar_ya_paso(v.id), "NO_ESTA_PEDIDA", "dos veces");
});

escenario("P-15 · solo el responsable edita y antes de pedir", async (c) => {
  const { api, como } = c;
  const v = await abrir(c, "12", { minimo_casas: 2 });
  await como("12");
  const eventos = await conEventos(api, async () => {
    const editado = ok(
      await api.editar_viaje(v.id, {
        proveedor: "Rubén 2",
        precio_por_casa: 160,
        capacidad_aprox: 8,
      }),
      "editar",
    );
    expect(editado).toMatchObject({
      proveedor: "Rubén 2",
      precio_por_casa: 160,
      capacidad_aprox: 8,
    });
  });
  expect(tipos(eventos)).toEqual(["viaje_editado"]);
  const sin = ok(
    await api.editar_viaje(v.id, {
      precio_por_casa: null,
      capacidad_aprox: null,
    }),
    "borrar opcionales",
  );
  expect(sin).toMatchObject({ precio_por_casa: null, capacidad_aprox: null });

  await anotar(c, "14", v.id);
  rechaza(
    await api.editar_viaje(v.id, { proveedor: "Otro" }),
    "NO_ES_RESPONSABLE",
    "otra casa",
  );
  await pedir(c, "12", v.id);
  await como("12");
  rechaza(
    await api.editar_viaje(v.id, { proveedor: "Otro" }),
    "VIAJE_CERRADO",
    "después de pedir",
  );
});

escenario(
  "P-15 · editar con datos inválidos se rechaza sin cambios",
  async (c) => {
    const { api, como } = c;
    const v = await abrir(c, "12", { minimo_casas: 5, capacidad_aprox: 6 });
    await como("12");
    const antes = await instantanea(c, ["12"]);
    await como("12");
    for (const [que, cambios] of [
      ["proveedor vacío", { proveedor: "" }],
      ["proveedor de 41 caracteres", { proveedor: "x".repeat(41) }],
      ["mínimo 0", { minimo_casas: 0 }],
      ["mínimo 31", { minimo_casas: 31 }],
      ["mínimo mayor que la capacidad", { minimo_casas: 7 }],
      ["capacidad menor que el mínimo", { capacidad_aprox: 4 }],
    ] as const) {
      rechaza(await api.editar_viaje(v.id, cambios), "DATOS_INVALIDOS", que);
    }
    expect(await instantanea(c, ["12"])).toEqual(antes);
  },
);

escenario("P-15 · bajar el mínimo puede dejar el viaje en lista", async (c) => {
  const { api, como } = c;
  const v = await abrir(c, "12", { minimo_casas: 5 });
  await anotar(c, "14", v.id);
  await anotar(c, "16", v.id);
  await como("12");
  expect(
    ok(await api.editar_viaje(v.id, { minimo_casas: 3 }), "bajar").estado,
  ).toBe("lista");
  expect(
    ok(await api.editar_viaje(v.id, { minimo_casas: 4 }), "subir").estado,
  ).toBe("juntando");
});

escenario(
  "P-16 · el aviso de responsabilidad se exige a quien abre o toma el viaje, no a quien se anota",
  async (c) => {
    const { api, como, reloj } = c;
    await como("12");
    rechaza(
      await api.abrir_viaje(sinAceptar({ proveedor: "Rubén 1" })),
      "FALTA_ACEPTAR",
      "abrir sin aceptar",
    );
    const v = await abrir(c, "12");
    await anotar(c, "14", v.id);
    await reloj.adelantar(24 * HORA);
    await como("14");
    rechaza(
      await api.tomar_responsabilidad(v.id, false as unknown as true),
      "FALTA_ACEPTAR",
      "tomar sin aceptar",
    );
    expect(
      (await ver(c, v.id)).estoy_anotado,
      "anotarse no pidió aceptar nada",
    ).toBe(true);
  },
);
