import {
  esNivelAljibe,
  huellaSha256,
  leerExif,
  marcasDeEvidencia,
  ordenCasa,
  type NivelAljibe,
} from "../../dominio";
import type { FotoAljibe, ReporteAljibe, Resultado } from "../contrato";
import type { ReporteAljibeGuardado } from "./estado";
import { fotoParaMemoria } from "./foto";
import { Transaccion, exito, falla } from "./transaccion";

export interface EvidenciaPreparada {
  huella: string;
  fechaExif: number | null;
  camara: string | null;
  fotoUrl: string | null;
}

/** Lee EXIF y calcula la huella. La foto reducida queda solo para la memoria. */
export async function prepararEvidencia(
  foto: FotoAljibe,
): Promise<EvidenciaPreparada> {
  const exif = leerExif(foto.bytes);
  const partes = [exif.fabricante, exif.modelo].filter(
    (p): p is string => p !== null && p !== "",
  );
  const camara = partes.length > 0 ? partes.join(" ").slice(0, 80) : null;
  return {
    huella: await huellaSha256(foto.bytes),
    fechaExif: exif.fechaOriginal,
    camara,
    fotoUrl: await fotoParaMemoria(foto.bytes, foto.tipo),
  };
}

interface Guardado {
  reporte: ReporteAljibe;
  anteriorId: string | null;
}

export function guardarReporte(
  tx: Transaccion,
  nivel: NivelAljibe,
  evidencia: EvidenciaPreparada | null,
): Resultado<Guardado> {
  const casa = tx.casa();
  if (casa === null) return falla("NO_AUTORIZADO");
  if (!esNivelAljibe(nivel)) return falla("DATOS_INVALIDOS");

  const marcas = marcasDeEvidencia({
    hayFoto: evidencia !== null,
    huella: evidencia?.huella ?? null,
    huellasPrevias: tx.estado.huellas_foto,
    fechaExif: evidencia?.fechaExif ?? null,
    ahora: tx.ahora,
  });
  const anterior = tx.estado.reportes_aljibe.find(
    (r) => r.casa_numero === casa,
  );
  if (anterior !== undefined) {
    tx.estado.reportes_aljibe = tx.estado.reportes_aljibe.filter(
      (r) => r.casa_numero !== casa,
    );
  }
  const reporte: ReporteAljibeGuardado = {
    id: tx.nuevoId(),
    casa_numero: casa,
    nivel,
    reportado_at: tx.ahora,
    marcas,
    camara: evidencia?.camara ?? null,
  };
  tx.estado.reportes_aljibe.push(reporte);
  if (
    evidencia !== null &&
    !tx.estado.huellas_foto.includes(evidencia.huella)
  ) {
    tx.estado.huellas_foto.push(evidencia.huella);
  }
  return exito({
    reporte: aReporte(reporte),
    anteriorId: anterior?.id ?? null,
  });
}

export function miReporte(tx: Transaccion): Resultado<ReporteAljibe | null> {
  const casa = tx.casa();
  if (casa === null) return falla("NO_AUTORIZADO");
  const reporte = tx.estado.reportes_aljibe.find((r) => r.casa_numero === casa);
  return exito(reporte === undefined ? null : aReporte(reporte));
}

export function listarAljibes(tx: Transaccion): Resultado<ReporteAljibe[]> {
  if (!tx.esCoordinador()) return falla("NO_AUTORIZADO");
  const lista = tx.estado.reportes_aljibe.map(aReporte).sort((a, b) => {
    const ordenA = ordenCasa(a.casa_numero) ?? Number.MAX_SAFE_INTEGER;
    const ordenB = ordenCasa(b.casa_numero) ?? Number.MAX_SAFE_INTEGER;
    return ordenA - ordenB || a.casa_numero.localeCompare(b.casa_numero);
  });
  return exito(lista);
}

export function fijarAljibe(
  tx: Transaccion,
  activo: boolean,
): Resultado<boolean> {
  if (activo !== true && activo !== false) return falla("DATOS_INVALIDOS");
  tx.estado.mostrar_aljibe = activo;
  return exito(activo);
}

function aReporte(reporte: ReporteAljibeGuardado): ReporteAljibe {
  return {
    id: reporte.id,
    casa_numero: reporte.casa_numero,
    nivel: reporte.nivel,
    reportado_at: reporte.reportado_at,
    marcas: [...reporte.marcas],
    camara: reporte.camara,
  };
}
