import { diasQueLleva, estadoFolio } from "../../dominio";
import type {
  FilaCaseta,
  ListaCaseta,
  OpcionesListaCaseta,
  Resultado,
} from "../contrato";
import { ordenDeCasa, type EnvioCaseta, type Folio } from "./estado";
import { Transaccion, exito, falla } from "./transaccion";

/**
 * C-01 a C-05: una fila por casa con folios activos, en el orden del
 * catálogo. Solo registra el envío; no cambia ningún folio.
 */
export function generarListaCaseta(
  tx: Transaccion,
  opciones: OpcionesListaCaseta,
): Resultado<ListaCaseta> {
  if (!tx.esCoordinador()) {
    return falla("NO_AUTORIZADO");
  }
  const porCasa = new Map<string, Folio[]>();
  for (const folio of tx.estado.folios) {
    if (estadoFolio(folio, tx.ahora) !== "activo") {
      continue;
    }
    const folios = porCasa.get(folio.casa_numero) ?? [];
    folios.push(folio);
    porCasa.set(folio.casa_numero, folios);
  }
  const orden = (numero: string) =>
    tx.estado.casas.find((c) => c.numero === numero)?.orden ??
    ordenDeCasa(numero);
  const filas: FilaCaseta[] = [...porCasa.entries()]
    .sort(([a], [b]) => orden(a) - orden(b))
    .map(([casa, folios]) => ({
      casa_numero: casa,
      folios: [...folios]
        .sort((a, b) => a.registrado_at - b.registrado_at)
        .map((f) => ({
          codigo: f.codigo,
          canal: f.canal,
          dias_que_lleva: diasQueLleva(f.registrado_at, tx.ahora),
        })),
    }));

  const envio: EnvioCaseta = {
    id: tx.nuevoId(),
    creado_at: tx.ahora,
    creado_por: tx.estado.sesion.telefono,
    columnas: [
      ...(opciones.canal ? (["canal"] as const) : []),
      ...(opciones.dias ? (["dias"] as const) : []),
    ],
    formato: opciones.formato,
  };
  tx.estado.envios_caseta.push(envio);
  for (const folios of porCasa.values()) {
    for (const folio of folios) {
      tx.estado.envios_caseta_folios.push({
        envio_id: envio.id,
        folio_id: folio.id,
      });
    }
  }
  const totalFolios = filas.reduce((n, f) => n + f.folios.length, 0);
  tx.evento("lista_caseta_generada", {
    envio_id: envio.id,
    casas: filas.length,
    folios: totalFolios,
    formato: envio.formato,
  });
  return exito({
    envio_id: envio.id,
    generada_at: tx.ahora,
    opciones: {
      canal: opciones.canal,
      dias: opciones.dias,
      formato: opciones.formato,
    },
    filas,
    total_casas: filas.length,
    total_folios: totalFolios,
  });
}
