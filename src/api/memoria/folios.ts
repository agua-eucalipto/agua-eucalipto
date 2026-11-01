import {
  TOPE_FOLIOS_POR_CANAL,
  VIGENCIA_MAXIMA_FOLIO_MS,
  clasificarFolio,
  estadoFolio,
} from "../../dominio";
import type { FolioVista, Resultado } from "../contrato";
import type { Folio } from "./estado";
import { Transaccion, exito, falla } from "./transaccion";
import { enmascararFolio, folioVista } from "./vistas";

function folioDeLaCasa(
  tx: Transaccion,
  casa: string,
  id: string,
): Folio | undefined {
  return tx.estado.folios.find((f) => f.id === id && f.casa_numero === casa);
}

function cerrar(tx: Transaccion, folio: Folio, cierre: Folio["cierre"]) {
  folio.cierre = cierre;
  folio.cerrado_at = tx.ahora;
}

export function listarFoliosCasa(tx: Transaccion): Resultado<FolioVista[]> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  return exito(
    tx.estado.folios
      .filter((f) => f.casa_numero === casa)
      .map((f) => folioVista(tx.estado, f, tx.ahora)),
  );
}

/** F-01 a F-05: formato, unicidad, tope por canal y reemplazo. */
export function registrarFolio(
  tx: Transaccion,
  codigo: string,
  reemplazaFolioId?: string,
): Resultado<FolioVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const clasificado = clasificarFolio(typeof codigo === "string" ? codigo : "");
  if (clasificado === null) {
    return falla("FOLIO_FORMATO_INVALIDO");
  }
  if (tx.estado.folios.some((f) => f.codigo === clasificado.codigo)) {
    return falla("FOLIO_YA_USADO");
  }
  const activos = (f: Folio) => estadoFolio(f, tx.ahora) === "activo";
  let anterior: Folio | undefined;
  if (reemplazaFolioId !== undefined) {
    anterior = folioDeLaCasa(tx, casa, reemplazaFolioId);
    if (
      anterior === undefined ||
      anterior.canal !== clasificado.canal ||
      !activos(anterior)
    ) {
      return falla("REEMPLAZO_INVALIDO");
    }
  } else {
    const delCanal = tx.estado.folios.filter(
      (f) =>
        f.casa_numero === casa && f.canal === clasificado.canal && activos(f),
    );
    if (delCanal.length >= TOPE_FOLIOS_POR_CANAL) {
      return falla("TOPE_CANAL");
    }
  }

  const nuevo: Folio = {
    id: tx.nuevoId(),
    codigo: clasificado.codigo,
    canal: clasificado.canal,
    casa_numero: casa,
    registrado_por: tx.estado.sesion.telefono,
    registrado_at: tx.ahora,
    extendido_at: null,
    cierre: null,
    cerrado_at: null,
    reemplazado_por: null,
  };
  tx.estado.folios.push(nuevo);
  tx.evento("folio_registrado", {
    folio_id: nuevo.id,
    folio: enmascararFolio(nuevo.codigo),
    canal: nuevo.canal,
  });
  if (anterior !== undefined) {
    cerrar(tx, anterior, "reemplazado");
    anterior.reemplazado_por = nuevo.id;
    tx.evento("folio_reemplazado", {
      folio_id: anterior.id,
      folio: enmascararFolio(anterior.codigo),
      reemplazado_por: enmascararFolio(nuevo.codigo),
    });
  }
  return exito(folioVista(tx.estado, nuevo, tx.ahora));
}

/** F-07: "sigue pendiente", una sola vez y antes de cumplir 6 días. */
export function marcarSiguePendiente(
  tx: Transaccion,
  folioId: string,
): Resultado<FolioVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const folio = folioDeLaCasa(tx, casa, folioId);
  if (folio === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (folio.cierre !== null) {
    return falla("FOLIO_CERRADO");
  }
  if (folio.extendido_at !== null) {
    return falla("YA_EXTENDIDO");
  }
  if (tx.ahora >= folio.registrado_at + VIGENCIA_MAXIMA_FOLIO_MS) {
    return falla("FUERA_DE_PLAZO");
  }
  folio.extendido_at = tx.ahora;
  tx.evento("folio_extendido", {
    folio_id: folio.id,
    folio: enmascararFolio(folio.codigo),
  });
  return exito(folioVista(tx.estado, folio, tx.ahora));
}

/**
 * F-08: "me surtieron". Con `quemarOtros`, cierra los demás activos de la
 * casa, de cualquier canal.
 */
export function marcarSurtido(
  tx: Transaccion,
  folioId: string,
  quemarOtros: boolean,
): Resultado<FolioVista[]> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const folio = folioDeLaCasa(tx, casa, folioId);
  if (folio === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (folio.cierre !== null) {
    return falla("FOLIO_CERRADO");
  }
  const otros = quemarOtros
    ? tx.estado.folios.filter(
        (f) =>
          f.casa_numero === casa &&
          f.id !== folio.id &&
          estadoFolio(f, tx.ahora) === "activo",
      )
    : [];
  const cambiados = [folio, ...otros];
  for (const f of cambiados) {
    cerrar(tx, f, "surtido");
    tx.evento("folio_surtido", {
      folio_id: f.id,
      folio: enmascararFolio(f.codigo),
    });
  }
  return exito(cambiados.map((f) => folioVista(tx.estado, f, tx.ahora)));
}

/** F-12: "no me surtieron" solo cierra un folio ya vencido. */
export function marcarSinSurtir(
  tx: Transaccion,
  folioId: string,
): Resultado<FolioVista> {
  const casa = tx.casa();
  if (casa === null) {
    return falla("NO_AUTORIZADO");
  }
  const folio = folioDeLaCasa(tx, casa, folioId);
  if (folio === undefined) {
    return falla("NO_ENCONTRADO");
  }
  if (folio.cierre !== null) {
    return falla("FOLIO_CERRADO");
  }
  if (estadoFolio(folio, tx.ahora) !== "vencido") {
    return falla("FOLIO_NO_VENCIDO");
  }
  cerrar(tx, folio, "cerrado_sin_surtir");
  tx.evento("folio_cerrado_sin_surtir", {
    folio_id: folio.id,
    folio: enmascararFolio(folio.codigo),
  });
  return exito(folioVista(tx.estado, folio, tx.ahora));
}
