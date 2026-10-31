import { expect } from "vitest";
import { escenario } from "./escenario";
import {
  HORA,
  MIN,
  abrir,
  anotacionDe,
  anotar,
  bitacoraCompleta,
  buscarViaje,
  casasEnOrden,
  conEventos,
  confirmar,
  dejarPendiente,
  espera,
  esperaDe,
  ok,
  ordenadas,
  pasar,
  pedir,
  rechaza,
  tipos,
  ver,
} from "./utiles";

/** Un viaje de `casas` ya pedido y pasado, listo para confirmar. */
async function viajeQuePaso(
  c: Parameters<typeof abrir>[0],
  responsable: string,
  otras: string[],
) {
  const v = await abrir(c, responsable, { minimo_casas: otras.length + 1 });
  for (const casa of otras) {
    await c.reloj.adelantar(HORA);
    await anotar(c, casa, v.id);
  }
  await pedir(c, responsable, v.id);
  await pasar(c, responsable, v.id);
  return v;
}

escenario(
  "P-09 · pendiente entra a la espera con prioridad y su antigüedad original",
  async (c) => {
    const { api, como, reloj } = c;
    const v = await abrir(c, "12", { minimo_casas: 3 });
    await reloj.adelantar(HORA);
    await anotar(c, "14", v.id);
    await reloj.adelantar(HORA);
    const lleno = await anotar(c, "16", v.id);
    const antiguedad14 = anotacionDe(lleno, "14").antiguedad_desde;
    await pedir(c, "12", v.id);
    await reloj.adelantar(2 * HORA);
    await pasar(c, "12", v.id);

    await confirmar(c, "12", v.id, "surtio");
    const tras = await confirmar(c, "14", v.id, "pendiente");
    expect(anotacionDe(tras, "12").estado).toBe("surtio");
    expect(anotacionDe(tras, "14").estado).toBe("pendiente");
    expect(anotacionDe(tras, "16").estado).toBe("anotada");

    const enEspera = await espera(c, "14");
    expect(enEspera.map((e) => e.casa_numero)).toEqual(["14"]);
    expect(esperaDe(enEspera, "14")).toMatchObject({
      con_prioridad: true,
      origen: "pendiente",
      antiguedad_desde: antiguedad14,
    });

    await como("14");
    rechaza(
      await api.confirmar_entrega(v.id, "surtio"),
      "YA_CONFIRMADO",
      "segunda vez",
    );
    await como("20");
    rechaza(
      await api.confirmar_entrega(v.id, "surtio"),
      "NO_ANOTADO",
      "casa ajena",
    );
    const eventos = (await bitacoraCompleta(api)).filter(
      (e) => e.tipo === "entrega_confirmada",
    );
    expect(eventos).toHaveLength(2);
  },
);

escenario(
  "P-10 · sin confirmar a las 72 h de ya pasó, sin espera ni prioridad",
  async (c) => {
    const { reloj } = c;
    const v = await viajeQuePaso(c, "12", ["14", "16"]);
    await confirmar(c, "12", v.id, "surtio");
    await confirmar(c, "14", v.id, "pendiente");

    await reloj.adelantar(71 * HORA + 59 * MIN);
    expect(anotacionDe(await ver(c, v.id, "20"), "16").sin_confirmar).toBe(
      false,
    );
    await reloj.adelantar(MIN);
    const vista = await ver(c, v.id, "20");
    expect(vista.estado).toBe("ya_paso");
    expect(anotacionDe(vista, "16").sin_confirmar).toBe(true);

    expect((await espera(c, "16")).map((e) => e.casa_numero)).toEqual(["14"]);
    const otro = await abrir(c, "20");
    await anotar(c, "16", otro.id);
  },
);

escenario(
  "P-11 · a las 72 h de abierto sin ya pasó, el barrido manda a todas a la espera",
  async (c) => {
    const { api, como, reloj } = c;
    const { antiguedad } = await dejarPendiente(c, "5", "20");
    await reloj.adelantar(HORA);
    const v = await abrir(c, "12", { minimo_casas: 5 });
    await reloj.adelantar(HORA);
    await anotar(c, "14", v.id);
    await reloj.adelantar(HORA);
    const antes = await anotar(c, "16", v.id);
    expect(casasEnOrden(antes)).toEqual(["20", "12", "14", "16"]);

    await reloj.adelantar(v.abierto_at + 72 * HORA - MIN - reloj.ahora());
    await como("18");
    expect((await ver(c, v.id)).estado, "a 1 min de las 72 h").toBe("juntando");
    expect(await espera(c, "18")).toEqual([]);

    await reloj.adelantar(MIN);
    const enEspera = await espera(c, "18");
    expect(enEspera.map((e) => e.casa_numero).sort()).toEqual(
      ordenadas(["12", "14", "16", "20"]),
    );
    for (const fila of enEspera) {
      expect(fila.origen, `origen de la casa ${fila.casa_numero}`).toBe(
        "viaje_cerrado",
      );
      expect(
        fila.antiguedad_desde,
        `antigüedad de la casa ${fila.casa_numero}`,
      ).toBe(anotacionDe(antes, fila.casa_numero).antiguedad_desde);
      expect(fila.con_prioridad).toBe(fila.casa_numero === "20");
    }
    expect(esperaDe(enEspera, "20").antiguedad_desde).toBe(antiguedad);
    const despues = await buscarViaje(c, v.id);
    expect(despues === undefined || despues.estado === "cerrado").toBe(true);

    const cierres = (await bitacoraCompleta(api)).filter(
      (e) => e.tipo === "viaje_cerrado_72h",
    );
    expect(cierres).toHaveLength(1);
    expect(cierres[0]).toMatchObject({ rol: "sistema", casa_numero: null });
  },
);

escenario(
  "P-11 · el barrido cierra los pedidos sin ya pasó y respeta los que ya pasaron",
  async (c) => {
    const { api, reloj } = c;
    const v = await abrir(c, "12", { minimo_casas: 3 });
    await anotar(c, "14", v.id);
    await anotar(c, "16", v.id);
    const v2 = await abrir(c, "22", { minimo_casas: 2 });
    await anotar(c, "23", v2.id);
    const inicio = reloj.ahora();

    await reloj.adelantar(10 * HORA);
    await pedir(c, "12", v.id);
    await pedir(c, "22", v2.id);
    await reloj.adelantar(HORA);
    await c.como("16");
    ok(await api.dar_de_baja(v.id), "baja después de pedir");
    await reloj.adelantar(39 * HORA);
    await pasar(c, "22", v2.id);

    await reloj.adelantar(inicio + 72 * HORA - reloj.ahora());
    const enEspera = await espera(c, "18");
    expect(enEspera.map((e) => e.casa_numero).sort()).toEqual(
      ordenadas(["12", "14"]),
    );
    expect((await ver(c, v2.id)).estado).toBe("ya_paso");
  },
);

escenario(
  "P-12 · a las 24 h de inactividad cualquier anotada toma la responsabilidad",
  async (c) => {
    const { api, como, reloj } = c;
    const v = await abrir(c, "12", { minimo_casas: 3 });
    await anotar(c, "14", v.id);

    await reloj.adelantar(23 * HORA);
    await como("14");
    rechaza(
      await api.tomar_responsabilidad(v.id, true),
      "RESPONSABLE_ACTIVO",
      "a las 23 h",
    );
    expect((await ver(c, v.id)).responsable_inactivo).toBe(false);

    await reloj.adelantar(HORA);
    expect((await ver(c, v.id)).responsable_inactivo).toBe(true);
    await como("20");
    rechaza(
      await api.tomar_responsabilidad(v.id, true),
      "NO_ANOTADO",
      "quien no está anotada",
    );
    await como("14");
    rechaza(
      await api.tomar_responsabilidad(v.id, false as unknown as true),
      "FALTA_ACEPTAR",
      "sin aceptar",
    );
    const eventos = await conEventos(api, async () => {
      const tomado = ok(
        await api.tomar_responsabilidad(v.id, true),
        "a las 24 h",
      );
      expect(tomado).toMatchObject({
        responsable_casa: "14",
        soy_responsable: true,
      });
    });
    expect(tipos(eventos)).toContain("responsabilidad_tomada");

    await como("12");
    rechaza(
      await api.editar_viaje(v.id, { proveedor: "Otro" }),
      "NO_ES_RESPONSABLE",
      "el anterior",
    );
    expect((await ver(c, v.id)).responsable_inactivo).toBe(false);
  },
);

escenario(
  "P-12 · cualquier acción del responsable reinicia el plazo",
  async (c) => {
    const { api, como, reloj } = c;
    const v = await abrir(c, "12", { minimo_casas: 3 });
    await anotar(c, "14", v.id);
    await reloj.adelantar(20 * HORA);
    await como("12");
    ok(await api.editar_viaje(v.id, { proveedor: "Rubén 2" }), "editar");

    await reloj.adelantar(4 * HORA);
    await como("14");
    rechaza(
      await api.tomar_responsabilidad(v.id, true),
      "RESPONSABLE_ACTIVO",
      "a las 24 h del inicio",
    );
    await reloj.adelantar(20 * HORA);
    ok(
      await api.tomar_responsabilidad(v.id, true),
      "a las 24 h de la última acción",
    );
  },
);

escenario("P-12 · el plazo también corre con el viaje pedido", async (c) => {
  const { api, como, reloj } = c;
  const v = await abrir(c, "12", { minimo_casas: 2 });
  await anotar(c, "14", v.id);
  await reloj.adelantar(HORA);
  await pedir(c, "12", v.id);
  await reloj.adelantar(24 * HORA);
  await como("14");
  ok(await api.tomar_responsabilidad(v.id, true), "a las 24 h de pedir");
});

escenario(
  "P-13 · me da igual va al viaje con más casas que siga abierto",
  async (c) => {
    const { api, como, reloj } = c;
    const a = await abrir(c, "12", { minimo_casas: 6 });
    await anotar(c, "14", a.id);
    await reloj.adelantar(HORA);
    const b = await abrir(c, "16", { minimo_casas: 6 });
    await anotar(c, "17", b.id);
    await anotar(c, "18", b.id);
    const d = await abrir(c, "22", { minimo_casas: 2 });
    for (const casa of ["23", "24", "25"]) {
      await anotar(c, casa, d.id);
    }
    await pedir(c, "22", d.id);

    await como("20");
    const eventos = await conEventos(api, async () => {
      const res = ok(await api.anotarse_cualquiera(), "me da igual");
      expect(res.espera).toBeUndefined();
      expect(res.viaje?.id).toBe(b.id);
      expect(res.viaje?.anotadas).toBe(4);
    });
    expect(tipos(eventos)).toContain("anotado_cualquiera");
    expect((await ver(c, a.id)).anotadas).toBe(2);

    await como("14");
    rechaza(await api.anotarse_cualquiera(), "YA_EN_VIAJE", "ya anotada");
  },
);

escenario(
  "P-13 · con el mismo número de casas gana el viaje más antiguo",
  async (c) => {
    const { api, como, reloj } = c;
    const a = await abrir(c, "12", { minimo_casas: 6 });
    await anotar(c, "14", a.id);
    await reloj.adelantar(HORA);
    const otro = await abrir(c, "16", { minimo_casas: 6 });
    await anotar(c, "17", otro.id);
    await como("20");
    expect(ok(await api.anotarse_cualquiera(), "me da igual").viaje?.id).toBe(
      a.id,
    );
  },
);

escenario(
  "P-13 · sin viaje abierto va a la espera sin prioridad, y de ahí se puede salir",
  async (c) => {
    const { api, como, reloj } = c;
    await como("20");
    const res = ok(await api.anotarse_cualquiera(), "sin viajes");
    expect(res.viaje).toBeUndefined();
    expect(res.espera).toMatchObject({
      casa_numero: "20",
      origen: "me_da_igual",
      con_prioridad: false,
      antiguedad_desde: reloj.ahora(),
    });
    expect((await espera(c, "20")).map((e) => e.casa_numero)).toEqual(["20"]);

    const eventos = await conEventos(api, async () => {
      ok(await api.salir_de_espera(), "salir de la espera");
    });
    expect(tipos(eventos)).toEqual(["salio_de_espera"]);
    expect(await espera(c, "20")).toEqual([]);
    rechaza(await api.salir_de_espera(), "NO_EN_ESPERA", "ya no está");

    const d = await abrir(c, "22", { minimo_casas: 2 });
    await anotar(c, "23", d.id);
    await pedir(c, "22", d.id);
    await como("21");
    expect(
      ok(await api.anotarse_cualquiera(), "solo hay un viaje pedido").espera,
    ).toBeDefined();
  },
);

escenario(
  "P-14 · cancelar es del responsable, antes de pedir; las casas pasan a la espera",
  async (c) => {
    const { api, como, reloj } = c;
    await dejarPendiente(c, "5", "20");
    await reloj.adelantar(HORA);
    const v = await abrir(c, "12", { minimo_casas: 3 });
    await anotar(c, "14", v.id);
    await reloj.adelantar(5 * HORA);
    const antes = await anotar(c, "16", v.id);

    await como("14");
    rechaza(await api.cancelar_viaje(v.id), "NO_ES_RESPONSABLE", "otra casa");
    await como("12");
    const eventos = await conEventos(api, async () => {
      ok(await api.cancelar_viaje(v.id), "cancelar");
    });
    expect(tipos(eventos)).toContain("viaje_cancelado");

    const enEspera = await espera(c, "12");
    expect(enEspera.map((e) => e.casa_numero).sort()).toEqual(
      ordenadas(["12", "14", "16", "20"]),
    );
    for (const fila of enEspera) {
      expect(fila.origen).toBe("viaje_cerrado");
      expect(fila.antiguedad_desde).toBe(
        anotacionDe(antes, fila.casa_numero).antiguedad_desde,
      );
      expect(fila.con_prioridad).toBe(fila.casa_numero === "20");
    }
    const despues = await buscarViaje(c, v.id);
    expect(despues === undefined || despues.estado === "cerrado").toBe(true);

    const p = await abrir(c, "22", { minimo_casas: 2 });
    await anotar(c, "23", p.id);
    await pedir(c, "22", p.id);
    await como("22");
    rechaza(
      await api.cancelar_viaje(p.id),
      "VIAJE_CERRADO",
      "después de pedir",
    );
  },
);
