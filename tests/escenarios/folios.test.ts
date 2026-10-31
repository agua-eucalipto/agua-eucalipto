import { expect } from "vitest";
import { escenario } from "./escenario";
import {
  DIA,
  HORA,
  MIN,
  conEventos,
  folioDe,
  foliosDe,
  ok,
  rechaza,
  registrar,
  tel,
  tipos,
  wa,
} from "./utiles";

escenario(
  "F-01 · el código se normaliza y es único para siempre",
  async (c) => {
    const { api, como } = c;
    const primero = await registrar(c, "7", "siapazap 1234-5678");
    expect(primero.codigo).toBe("SIAPAZAP12345678");
    expect(primero.canal).toBe("whatsapp");

    rechaza(
      await api.registrar_folio("SIAPAZAP12345678"),
      "FOLIO_YA_USADO",
      "mismo código",
    );
    rechaza(
      await api.registrar_folio("SIAPAZAP.1234.5678"),
      "FOLIO_YA_USADO",
      "mismo código con puntos",
    );
    await como("8");
    rechaza(
      await api.registrar_folio(" siapazap-12345678 "),
      "FOLIO_YA_USADO",
      "mismo código desde otra casa",
    );
    expect(await foliosDe(c, "7")).toHaveLength(1);
    expect(await foliosDe(c, "8")).toHaveLength(0);
  },
);

escenario(
  "F-01 · F-11 · un folio surtido, vencido o reemplazado sigue bloqueando su código",
  async (c) => {
    const { api, como, reloj } = c;
    const surtido = await registrar(c, "7", wa(1));
    ok(await api.marcar_surtido(surtido.id, false), "marcar surtido");
    const vencido = await registrar(c, "7", tel(1));
    const anterior = await registrar(c, "7", wa(2));
    await registrar(c, "7", wa(3), anterior.id);
    await reloj.adelantar(72 * HORA);

    expect((await folioDe(c, "7", vencido.id)).estado).toBe("vencido");
    expect((await folioDe(c, "7", anterior.id)).estado).toBe("reemplazado");

    for (const casa of ["9", "7"]) {
      await como(casa);
      for (const codigo of [wa(1), tel(1), wa(2)]) {
        rechaza(
          await api.registrar_folio(codigo),
          "FOLIO_YA_USADO",
          `registrar ${codigo} desde la casa ${casa}`,
        );
      }
    }
  },
);

escenario(
  "F-02 · el prefijo decide el canal y el resto es inválido",
  async (c) => {
    const { api, como } = c;
    await como("7");
    for (const invalido of [
      "ABC123",
      "SIAPAZAP",
      "1162",
      "SIAPAZAP123",
      "1162123",
      "SIAPAZAP12AB",
      "",
    ]) {
      rechaza(
        await api.registrar_folio(invalido),
        "FOLIO_FORMATO_INVALIDO",
        `registrar «${invalido}»`,
      );
    }
    expect(await foliosDe(c, "7")).toHaveLength(0);

    const whatsapp = await registrar(c, "7", "siapazap-2026.0001");
    const telefono = await registrar(c, "7", "1162 4500-1");
    expect(whatsapp).toMatchObject({
      codigo: "SIAPAZAP20260001",
      canal: "whatsapp",
    });
    expect(telefono).toMatchObject({ codigo: "116245001", canal: "telefono" });
  },
);

escenario("F-03 · tope de 2 activos por canal", async (c) => {
  const { api, como } = c;
  const w1 = await registrar(c, "7", wa(1));
  await registrar(c, "7", wa(2));
  await registrar(c, "7", tel(1));
  await registrar(c, "7", tel(2));

  await como("7");
  rechaza(await api.registrar_folio(wa(3)), "TOPE_CANAL", "3.º de WhatsApp");
  rechaza(await api.registrar_folio(tel(3)), "TOPE_CANAL", "3.º de teléfono");

  const folios = await foliosDe(c, "7");
  const activosWa = folios.filter(
    (f) => f.canal === "whatsapp" && f.estado === "activo",
  );
  expect(activosWa.map((f) => f.codigo).sort()).toEqual([wa(1), wa(2)]);
  expect(folios).toHaveLength(4);

  // El código rechazado no quedó bloqueado: se puede usar reemplazando.
  const nuevo = await registrar(c, "7", wa(3), w1.id);
  expect(nuevo.estado).toBe("activo");
});

escenario(
  "F-04 · reemplazar cierra el anterior, activa el nuevo y deja dos eventos",
  async (c) => {
    const { api, como, reloj } = c;
    const w1 = await registrar(c, "7", wa(1));
    const w2 = await registrar(c, "7", wa(2));
    const t1 = await registrar(c, "7", tel(1));
    const ajeno = await registrar(c, "8", wa(10));
    await reloj.adelantar(HORA);

    await como("7");
    let nuevo = w1;
    const eventos = await conEventos(api, async () => {
      nuevo = ok(await api.registrar_folio(wa(3), w1.id), "reemplazar");
    });
    expect(tipos(eventos)).toEqual(["folio_registrado", "folio_reemplazado"]);
    expect(nuevo.estado).toBe("activo");

    const anterior = await folioDe(c, "7", w1.id);
    expect(anterior).toMatchObject({
      estado: "reemplazado",
      cierre: "reemplazado",
      cerrado_at: reloj.ahora(),
      reemplazado_por: nuevo.id,
    });
    expect((await folioDe(c, "7", w2.id)).estado).toBe("activo");

    await como("7");
    rechaza(
      await api.registrar_folio(wa(4), ajeno.id),
      "REEMPLAZO_INVALIDO",
      "reemplazar un folio de otra casa",
    );
    rechaza(
      await api.registrar_folio(wa(4), t1.id),
      "REEMPLAZO_INVALIDO",
      "reemplazar un folio de otro canal",
    );
    rechaza(
      await api.registrar_folio(wa(4), w1.id),
      "REEMPLAZO_INVALIDO",
      "reemplazar un folio ya reemplazado",
    );
    rechaza(
      await api.registrar_folio(wa(4), "no-existe"),
      "REEMPLAZO_INVALIDO",
      "reemplazar un folio que no existe",
    );
    // Los rechazos no gastaron el código.
    ok(await api.registrar_folio(wa(4), w2.id), "reemplazo válido al final");
  },
);

escenario("F-05 · se puede reemplazar sin haber llegado al tope", async (c) => {
  const anterior = await registrar(c, "7", wa(1));
  const nuevo = await registrar(c, "7", wa(2), anterior.id);
  const folios = await foliosDe(c, "7");
  expect(folios.find((f) => f.id === anterior.id)?.estado).toBe("reemplazado");
  expect(folios.find((f) => f.id === nuevo.id)?.estado).toBe("activo");
  expect(
    folios.filter((f) => f.canal === "whatsapp" && f.estado === "activo"),
  ).toHaveLength(1);
});

escenario(
  "F-06 · F-11 · activo 72 h; después vence y deja de contar para el tope",
  async (c) => {
    const { api, como, reloj } = c;
    const f1 = await registrar(c, "7", wa(1));
    const f2 = await registrar(c, "7", wa(2));

    await reloj.adelantar(71 * HORA + 59 * MIN);
    for (const f of [f1, f2]) {
      const vista = await folioDe(c, "7", f.id);
      expect(vista.estado, "a las 71 h 59 min").toBe("activo");
      expect(vista.vence_at).toBe(f.registrado_at + 72 * HORA);
    }

    await reloj.adelantar(MIN);
    for (const f of [f1, f2]) {
      const vista = await folioDe(c, "7", f.id);
      expect(vista.estado, "a las 72 h").toBe("vencido");
      expect(vista.dias_que_lleva).toBe(3);
    }

    await como("7");
    ok(await api.registrar_folio(wa(3)), "3.º WhatsApp con los 2 vencidos");
    ok(await api.registrar_folio(wa(4)), "4.º WhatsApp");
    rechaza(
      await api.registrar_folio(wa(5)),
      "TOPE_CANAL",
      "con 2 activos nuevos de WhatsApp",
    );
  },
);

escenario(
  "F-07 · sigue pendiente una sola vez, hasta el día 6 y aun vencido",
  async (c) => {
    const { api, como, reloj } = c;
    const inicio = reloj.ahora();
    const a = await registrar(c, "7", wa(1));
    const b = await registrar(c, "8", wa(2));
    const cc = await registrar(c, "9", wa(3));
    const d = await registrar(c, "10", wa(4));

    await reloj.adelantar(80 * HORA);
    await como("7");
    const extendido = ok(await api.marcar_sigue_pendiente(a.id), "hora 80");
    expect(extendido).toMatchObject({
      extendido_at: inicio + 80 * HORA,
      vence_at: inicio + 144 * HORA,
      estado: "activo",
      puede_extender: false,
    });
    rechaza(
      await api.marcar_sigue_pendiente(a.id),
      "YA_EXTENDIDO",
      "segunda vez",
    );

    await reloj.adelantar(63 * HORA + 59 * MIN);
    await como("9");
    ok(await api.marcar_sigue_pendiente(cc.id), "hora 143 h 59 min");

    await reloj.adelantar(MIN);
    await como("10");
    rechaza(
      await api.marcar_sigue_pendiente(d.id),
      "FUERA_DE_PLAZO",
      "a las 144 h",
    );

    await reloj.adelantar(HORA);
    await como("8");
    rechaza(
      await api.marcar_sigue_pendiente(b.id),
      "FUERA_DE_PLAZO",
      "a las 145 h",
    );
  },
);

escenario(
  "F-07 · extender antes de vencer también lleva la vigencia a 6 días",
  async (c) => {
    const { api, como, reloj } = c;
    const folio = await registrar(c, "7", wa(1));
    await reloj.adelantar(10 * HORA);
    await como("7");
    const extendido = ok(await api.marcar_sigue_pendiente(folio.id), "hora 10");
    expect(extendido.vence_at).toBe(folio.registrado_at + 144 * HORA);
    expect(extendido.estado).toBe("activo");
  },
);

escenario("F-07 · errores de sigue pendiente", async (c) => {
  const { api, como } = c;
  const propio = await registrar(c, "7", wa(1));
  const cerrado = await registrar(c, "7", wa(2));
  ok(await api.marcar_surtido(cerrado.id, false), "marcar surtido");
  const reemplazado = await registrar(c, "7", tel(1));
  await registrar(c, "7", tel(2), reemplazado.id);

  await como("7");
  rechaza(
    await api.marcar_sigue_pendiente("no-existe"),
    "NO_ENCONTRADO",
    "id inexistente",
  );
  rechaza(
    await api.marcar_sigue_pendiente(cerrado.id),
    "FOLIO_CERRADO",
    "folio surtido",
  );
  rechaza(
    await api.marcar_sigue_pendiente(reemplazado.id),
    "FOLIO_CERRADO",
    "folio reemplazado",
  );
  await como("8");
  rechaza(
    await api.marcar_sigue_pendiente(propio.id),
    "NO_ENCONTRADO",
    "folio de otra casa",
  );
});

escenario(
  "F-08 · me surtieron quema los demás activos, no los vencidos ni los cerrados",
  async (c) => {
    const { api, como, reloj } = c;
    const vencido = await registrar(c, "7", wa(1));
    await reloj.adelantar(73 * HORA);
    const a = await registrar(c, "7", wa(2));
    const b = await registrar(c, "7", wa(3));
    const cc = await registrar(c, "7", tel(1));
    const z = await registrar(c, "7", tel(2));
    await como("7");
    ok(await api.marcar_surtido(z.id, false), "cerrar el folio previo");
    const cerradoAt = reloj.ahora();
    await reloj.adelantar(HORA);

    const cambiados = ok(await api.marcar_surtido(a.id, true), "me surtieron");
    expect(cambiados.map((f) => f.id).sort()).toEqual(
      [a.id, b.id, cc.id].sort(),
    );
    for (const f of cambiados) {
      expect(f).toMatchObject({
        estado: "surtido",
        cierre: "surtido",
        cerrado_at: reloj.ahora(),
      });
    }
    expect(await folioDe(c, "7", vencido.id)).toMatchObject({
      estado: "vencido",
      cierre: null,
    });
    expect((await folioDe(c, "7", z.id)).cerrado_at).toBe(cerradoAt);
  },
);

escenario(
  "F-08 · sin quemar los otros solo cierra ese; también sirve un vencido",
  async (c) => {
    const { api, como, reloj } = c;
    const p = await registrar(c, "7", wa(1));
    const q = await registrar(c, "7", wa(2));
    await como("7");
    const cambiados = ok(await api.marcar_surtido(p.id, false), "sin quemar");
    expect(cambiados.map((f) => f.id)).toEqual([p.id]);
    expect((await folioDe(c, "7", q.id)).estado).toBe("activo");

    await reloj.adelantar(73 * HORA);
    expect((await folioDe(c, "7", q.id)).estado).toBe("vencido");
    const sobreVencido = ok(
      await api.marcar_surtido(q.id, false),
      "sobre vencido",
    );
    expect(sobreVencido[0]).toMatchObject({ id: q.id, estado: "surtido" });
  },
);

escenario("F-08 · errores de me surtieron", async (c) => {
  const { api, como } = c;
  const surtido = await registrar(c, "7", wa(1));
  const reemplazado = await registrar(c, "7", wa(2));
  await registrar(c, "7", wa(3), reemplazado.id);
  await como("7");
  ok(await api.marcar_surtido(surtido.id, false), "primera vez");
  rechaza(
    await api.marcar_surtido(surtido.id, true),
    "FOLIO_CERRADO",
    "ya surtido",
  );
  rechaza(
    await api.marcar_surtido(reemplazado.id, true),
    "FOLIO_CERRADO",
    "reemplazado",
  );
  rechaza(
    await api.marcar_surtido("no-existe", true),
    "NO_ENCONTRADO",
    "inexistente",
  );
  await como("8");
  rechaza(
    await api.marcar_surtido(surtido.id, true),
    "NO_ENCONTRADO",
    "de otra casa",
  );
});

escenario("F-09 · sin límite de folios al mes", async (c) => {
  const { api, como, reloj } = c;
  for (let i = 1; i <= 12; i += 1) {
    const folio = await registrar(c, "7", wa(i));
    await como("7");
    ok(await api.marcar_surtido(folio.id, false), `surtir el folio ${i}`);
    await reloj.adelantar(2 * DIA);
  }
  expect(await foliosDe(c, "7")).toHaveLength(12);
});

escenario(
  "F-10 · vence hoy con menos de 24 h; vencido ofrece sigue pendiente",
  async (c) => {
    const { reloj } = c;
    const folio = await registrar(c, "7", wa(1));
    const estado = async () => folioDe(c, "7", folio.id);

    await reloj.adelantar(47 * HORA + 59 * MIN);
    expect((await estado()).vence_hoy, "a las 47 h 59 min").toBe(false);
    await reloj.adelantar(MIN);
    expect((await estado()).vence_hoy, "a las 48 h (faltan 24 h exactas)").toBe(
      false,
    );
    await reloj.adelantar(MIN);
    expect((await estado()).vence_hoy, "a las 48 h 01 min").toBe(true);

    await reloj.adelantar(24 * HORA);
    expect(await estado()).toMatchObject({
      estado: "vencido",
      vence_hoy: false,
      puede_extender: true,
    });
  },
);
