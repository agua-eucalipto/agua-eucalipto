import { expect } from "vitest";
import type { OpcionesListaCaseta } from "../../src/api/contrato";
import { escenario } from "./escenario";
import {
  DIA,
  HORA,
  bitacoraCompleta,
  conEventos,
  foliosDe,
  instantanea,
  ok,
  rechaza,
  registrar,
  tel,
  tipos,
  wa,
} from "./utiles";
import type { Contexto } from "./escenario";

const COMPLETA: OpcionesListaCaseta = {
  canal: true,
  dias: true,
  formato: "imprimir",
};

/**
 * Deja listo un día de trabajo: casas 2, 7, 10, 13 y 25 con folios activos;
 * 20 con un folio vencido; 11 con uno surtido. Termina 73 h después del inicio.
 */
async function prepararDia(c: Contexto) {
  const { api, como, reloj } = c;
  await registrar(c, "20", wa(90));
  const surtido = await registrar(c, "11", wa(91));
  await como("11");
  ok(await api.marcar_surtido(surtido.id, false), "surtir");
  await reloj.adelantar(DIA);

  const r = await registrar(c, "13", wa(92));
  const r2 = await registrar(c, "13", wa(93), r.id);
  await registrar(c, "10", wa(94));
  await registrar(c, "2", tel(1));
  const a = await registrar(c, "7", wa(95));
  const b = await registrar(c, "7", wa(96));
  const t = await registrar(c, "7", tel(2));
  await registrar(c, "25", wa(97));
  await reloj.adelantar(49 * HORA);
  return { r2, a, b, t };
}

escenario(
  "C-01 · un vecino no puede generar la lista para caseta",
  async (c) => {
    const { api, como } = c;
    await registrar(c, "7", wa(1));
    await como("7");
    const antes = await instantanea(c, ["7"]);
    rechaza(
      await api.generar_lista_caseta(COMPLETA),
      "NO_AUTORIZADO",
      "lista de vecino",
    );
    expect(await instantanea(c, ["7"])).toEqual(antes);
  },
);

escenario(
  "C-01 · el resto de las operaciones de coordinador también rechazan al vecino",
  async (c) => {
    const { api, como } = c;
    await como("7");
    rechaza(
      await api.listar_solicitudes(),
      "NO_AUTORIZADO",
      "listar solicitudes",
    );
    rechaza(await api.listar_telefonos(), "NO_AUTORIZADO", "listar teléfonos");
    rechaza(
      await api.resolver_solicitud("x", true),
      "NO_AUTORIZADO",
      "resolver solicitud",
    );
    rechaza(
      await api.reiniciar_telefono("5500000008"),
      "NO_AUTORIZADO",
      "reiniciar teléfono",
    );
  },
);

escenario(
  "C-02 · una fila por casa, en orden numérico, solo con folios activos",
  async (c) => {
    const { api, como } = c;
    const { r2, a, b, t } = await prepararDia(c);
    await como("coordinador");
    const lista = ok(await api.generar_lista_caseta(COMPLETA), "generar lista");

    expect(lista.filas.map((f) => f.casa_numero)).toEqual([
      "2",
      "7",
      "10",
      "13",
      "25",
    ]);
    const de = (casa: string) =>
      lista.filas
        .find((f) => f.casa_numero === casa)
        ?.folios.map((f) => f.codigo)
        .sort();
    expect(de("7")).toEqual([a.codigo, b.codigo, t.codigo].sort());
    expect(de("13")).toEqual([r2.codigo]);
    expect(lista.total_casas).toBe(5);
    expect(lista.total_folios).toBe(7);
  },
);

escenario("C-03 · columnas fijas y opcionales de la lista", async (c) => {
  const { api, como, reloj } = c;
  await registrar(c, "7", wa(1));
  await reloj.adelantar(2 * DIA + HORA);
  await registrar(c, "7", tel(1));
  await como("coordinador");

  const conTodo = ok(
    await api.generar_lista_caseta(COMPLETA),
    "con canal y días",
  );
  expect(conTodo.opciones).toEqual(COMPLETA);
  const sinNada = ok(
    await api.generar_lista_caseta({
      canal: false,
      dias: false,
      formato: "imprimir",
    }),
    "sin opcionales",
  );
  expect(sinNada.opciones).toEqual({
    canal: false,
    dias: false,
    formato: "imprimir",
  });

  const folios = conTodo.filas[0]?.folios ?? [];
  expect(conTodo.filas[0]?.casa_numero).toBe("7");
  expect(folios.map((f) => f.codigo).sort()).toEqual([tel(1), wa(1)].sort());
  expect(folios.find((f) => f.codigo === wa(1))).toMatchObject({
    canal: "whatsapp",
    dias_que_lleva: 2,
  });
  expect(folios.find((f) => f.codigo === tel(1))).toMatchObject({
    canal: "telefono",
    dias_que_lleva: 0,
  });
});

escenario(
  "C-04 · la lista sale igual para imprimir y para WhatsApp",
  async (c) => {
    const { api, como } = c;
    await registrar(c, "7", wa(1));
    await registrar(c, "10", tel(1));
    await como("coordinador");
    const impresa = ok(await api.generar_lista_caseta(COMPLETA), "imprimir");
    const whatsapp = ok(
      await api.generar_lista_caseta({ ...COMPLETA, formato: "whatsapp" }),
      "whatsapp",
    );
    expect(impresa.opciones.formato).toBe("imprimir");
    expect(whatsapp.opciones.formato).toBe("whatsapp");
    expect(whatsapp.filas).toEqual(impresa.filas);
  },
);

escenario(
  "C-05 · generar la lista no cambia folios y registra el envío",
  async (c) => {
    const { api, como, reloj } = c;
    const enLista = await registrar(c, "7", wa(1));
    const surtido = await registrar(c, "8", wa(2));
    await como("8");
    ok(await api.marcar_surtido(surtido.id, false), "surtir");
    await reloj.adelantar(HORA);

    const antes = await foliosDe(c, "7");
    await como("coordinador");
    const inicial = ok(await api.generar_lista_caseta(COMPLETA), "primera");
    let segunda = inicial;
    const eventos = await conEventos(api, async () => {
      segunda = ok(await api.generar_lista_caseta(COMPLETA), "segunda");
    });
    expect(segunda.envio_id, "cada lista es un envío distinto").not.toBe(
      inicial.envio_id,
    );
    expect(tipos(eventos)).toEqual(["lista_caseta_generada"]);

    const despues = await foliosDe(c, "7");
    expect(
      despues.map((f) => ({ ...f, ultimo_envio_caseta_at: null })),
      "solo cambia el último envío",
    ).toEqual(antes.map((f) => ({ ...f, ultimo_envio_caseta_at: null })));
    expect(
      despues.find((f) => f.id === enLista.id)?.ultimo_envio_caseta_at,
    ).toBe(segunda.generada_at);
    expect((await foliosDe(c, "8"))[0]?.ultimo_envio_caseta_at).toBeNull();

    await reloj.adelantar(HORA);
    await como("coordinador");
    const tercera = ok(await api.generar_lista_caseta(COMPLETA), "tercera");
    expect(tercera.envio_id).not.toBe(segunda.envio_id);
    expect((await foliosDe(c, "7"))[0]?.ultimo_envio_caseta_at).toBe(
      tercera.generada_at,
    );
    expect(
      (await bitacoraCompleta(api)).filter(
        (e) => e.tipo === "lista_caseta_generada",
      ),
    ).toHaveLength(3);
  },
);
