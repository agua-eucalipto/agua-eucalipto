import { expect } from "vitest";
import { escenario } from "./escenario";
import {
  COORDINADOR,
  PIN,
  TELEFONO_DESCONOCIDO,
  TELEFONO_FUERA_DE_LISTA,
  telefonoDe,
} from "./mundo";
import { MIN, bitacoraCompleta, ok, rechaza } from "./utiles";

escenario(
  "A-01 · teléfono de la lista y casa del catálogo entran; la sesión queda abierta",
  async ({ api }) => {
    expect(ok(await api.sesion_actual(), "sesión inicial")).toEqual({
      casa: null,
      rol: "sin_sesion",
    });

    const primera = ok(
      await api.ingresar(telefonoDe("7"), PIN, "7"),
      "primer ingreso",
    );
    expect(primera).toEqual({ casa: "7", rol: "vecino" });
    expect(ok(await api.sesion_actual(), "sesión")).toEqual(primera);

    const otraVez = ok(
      await api.ingresar("(55) 0000-0007", PIN),
      "segundo ingreso",
    );
    expect(otraVez).toEqual({ casa: "7", rol: "vecino" });

    const coordinador = ok(
      await api.ingresar(COORDINADOR.telefono, PIN, COORDINADOR.casa),
      "coordinador",
    );
    expect(coordinador).toEqual({ casa: COORDINADOR.casa, rol: "coordinador" });
  },
);

escenario(
  "A-01 · ingresar rechaza teléfono, PIN o casa inválidos",
  async ({ api }) => {
    rechaza(
      await api.ingresar("123", PIN, "7"),
      "TELEFONO_INVALIDO",
      "teléfono corto",
    );
    for (const pin of ["12", "abcd", "12345"]) {
      rechaza(
        await api.ingresar(telefonoDe("8"), pin, "8"),
        "PIN_INVALIDO",
        `PIN «${pin}»`,
      );
    }
    rechaza(
      await api.ingresar(telefonoDe("9"), PIN, "99"),
      "CASA_NO_EXISTE",
      "casa 99",
    );
    expect(ok(await api.sesion_actual(), "sesión")).toMatchObject({
      rol: "sin_sesion",
    });
  },
);

escenario(
  "A-01 · un PIN incorrecto no entra",
  async ({ api }) => {
    ok(await api.ingresar(telefonoDe("7"), PIN, "7"), "crear el PIN");
    rechaza(
      await api.ingresar(telefonoDe("7"), "9999"),
      "PIN_INCORRECTO",
      "PIN equivocado",
    );
  },
  { requiere: "pin_verificado" },
);

escenario(
  "A-02 · teléfono fuera de lista o casa fuera de catálogo quedan como solicitud pendiente",
  async ({ api, como }) => {
    const porTelefono = ok(
      await api.solicitar_acceso(
        TELEFONO_FUERA_DE_LISTA,
        "Eucalipto 10",
        "telefono_fuera_de_lista",
      ),
      "teléfono fuera de lista",
    );
    expect(porTelefono).toMatchObject({
      estado: "pendiente",
      casa_texto: "Eucalipto 10",
      motivo: "telefono_fuera_de_lista",
    });
    expect(porTelefono).not.toHaveProperty("telefono");
    expect(porTelefono).not.toHaveProperty("resuelta_por");
    expect(ok(await api.sesion_actual(), "sesión")).toMatchObject({
      rol: "pendiente",
    });

    const porCasa = ok(
      await api.solicitar_acceso(
        telefonoDe("8"),
        "Naranjo 8",
        "casa_fuera_de_catalogo",
      ),
      "casa fuera de catálogo",
    );
    expect(porCasa).toMatchObject({
      estado: "pendiente",
      motivo: "casa_fuera_de_catalogo",
    });
    rechaza(
      await api.solicitar_acceso("123", "Naranjo 8", "casa_fuera_de_catalogo"),
      "TELEFONO_INVALIDO",
      "teléfono inválido",
    );

    await como("coordinador");
    const solicitudes = ok(
      await api.listar_solicitudes(),
      "listar solicitudes",
    );
    expect(solicitudes.map((s) => s.telefono).sort()).toEqual(
      [TELEFONO_FUERA_DE_LISTA, telefonoDe("8")].sort(),
    );
  },
);

escenario(
  "A-02 · el coordinador resuelve una solicitud una sola vez",
  async ({ api, como, reloj }) => {
    const enviada = ok(
      await api.solicitar_acceso(
        TELEFONO_FUERA_DE_LISTA,
        "Eucalipto 10",
        "telefono_fuera_de_lista",
      ),
      "solicitar",
    );
    await como("coordinador");
    const eventos = (await bitacoraCompleta(api)).length;
    const resuelta = ok(
      await api.resolver_solicitud(enviada.id, false),
      "rechazar",
    );
    expect(resuelta).toMatchObject({
      id: enviada.id,
      estado: "rechazada",
      resuelta_at: reloj.ahora(),
    });
    expect((await bitacoraCompleta(api)).length).toBeGreaterThan(eventos);
    rechaza(
      await api.resolver_solicitud(enviada.id, true),
      "YA_RESUELTA",
      "segunda resolución",
    );
    rechaza(
      await api.resolver_solicitud("no-existe", true),
      "NO_ENCONTRADO",
      "id inexistente",
    );
  },
);

escenario(
  "A-03 · una casa de otra calle del coto se rechaza sin crear solicitud",
  async ({ api, como }) => {
    rechaza(
      await api.solicitar_acceso(
        TELEFONO_FUERA_DE_LISTA,
        "Ciruelo 5",
        "casa_fuera_de_catalogo",
      ),
      "CASA_OTRA_CALLE",
      "casa de Ciruelo",
    );
    await como("coordinador");
    expect(ok(await api.listar_solicitudes(), "listar")).toEqual([]);
    const creadas = (await bitacoraCompleta(api)).filter(
      (e) => e.tipo === "solicitud_creada",
    );
    expect(creadas).toEqual([]);
  },
);

escenario(
  "A-04 · reiniciar un teléfono borra su PIN y su casa",
  async ({ api, como, reloj }) => {
    const telefono = telefonoDe("7");
    ok(await api.ingresar(telefono, PIN, "7"), "ingreso previo");
    await como("coordinador");
    const antes = ok(await api.listar_telefonos(), "listar").find(
      (t) => t.numero === telefono,
    );
    expect(antes).toMatchObject({ casa_numero: "7", tiene_pin: true });

    ok(await api.reiniciar_telefono(telefono), "reiniciar");
    const despues = ok(await api.listar_telefonos(), "listar").find(
      (t) => t.numero === telefono,
    );
    expect(despues).toMatchObject({
      casa_numero: null,
      tiene_pin: false,
      en_lista_blanca: true,
      reiniciado_at: reloj.ahora(),
    });
    const eventos = (await bitacoraCompleta(api)).filter(
      (e) => e.tipo === "telefono_reiniciado",
    );
    expect(eventos).toHaveLength(1);

    rechaza(
      await api.reiniciar_telefono(TELEFONO_DESCONOCIDO),
      "NO_ENCONTRADO",
      "teléfono ajeno",
    );
    expect(ok(await api.ingresar(telefono, PIN, "8"), "ingreso nuevo")).toEqual(
      {
        casa: "8",
        rol: "vecino",
      },
    );
  },
);

escenario(
  "A-05 · cinco PIN fallidos bloquean el teléfono 15 minutos",
  async ({ api, como, reloj }) => {
    const telefono = telefonoDe("7");
    ok(await api.ingresar(telefono, PIN, "7"), "crear el PIN");
    for (let intento = 1; intento <= 4; intento += 1) {
      rechaza(
        await api.ingresar(telefono, "0000"),
        "PIN_INCORRECTO",
        `fallo ${intento}`,
      );
    }
    await api.ingresar(telefono, "0000");
    rechaza(
      await api.ingresar(telefono, PIN),
      "BLOQUEADO",
      "con el PIN correcto mientras dura",
    );

    await como("coordinador");
    const fila = ok(await api.listar_telefonos(), "listar").find(
      (t) => t.numero === telefono,
    );
    expect(fila?.bloqueado_hasta).toBe(reloj.ahora() + 15 * MIN);

    await reloj.adelantar(14 * MIN + 59 * 1000);
    rechaza(
      await api.ingresar(telefono, PIN),
      "BLOQUEADO",
      "a los 14 min 59 s",
    );
    await reloj.adelantar(1000);
    ok(await api.ingresar(telefono, PIN), "a los 15 min");
  },
  { requiere: "pin_verificado" },
);
