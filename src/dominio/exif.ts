/** Lo que se puede leer de un JPEG sin librerías: fecha original y cámara. */
export interface ExifLeido {
  fechaOriginal: number | null;
  fabricante: string | null;
  modelo: string | null;
}

const VACIO: ExifLeido = {
  fechaOriginal: null,
  fabricante: null,
  modelo: null,
};

const MARCA_MAKE = 0x010f;
const MARCA_MODEL = 0x0110;
const MARCA_EXIF = 0x8769;
const MARCA_FECHA = 0x9003;

/**
 * Lee `DateTimeOriginal`, `Make` y `Model` de un JPEG (APP1 / TIFF).
 * Si no hay EXIF, o el archivo no es JPEG, devuelve campos vacíos. No lanza.
 */
export function leerExif(bytes: Uint8Array): ExifLeido {
  try {
    const tiff = segmentoTiff(bytes);
    if (tiff === null) return { ...VACIO };
    return leerTiff(tiff);
  } catch {
    return { ...VACIO };
  }
}

/**
 * `YYYY:MM:DD HH:MM:SS` del EXIF, interpretado en la hora local del navegador.
 * Devuelve milisegundos, o `null` si no tiene esa forma.
 */
export function fechaExifAMilisegundos(texto: string): number | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
    texto.trim(),
  );
  if (m === null) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const hora = Number(m[4]);
  const minuto = Number(m[5]);
  const segundo = Number(m[6]);
  if (
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31 ||
    hora > 23 ||
    minuto > 59 ||
    segundo > 60
  ) {
    return null;
  }
  const ms = new Date(anio, mes - 1, dia, hora, minuto, segundo).getTime();
  if (Number.isNaN(ms)) return null;
  const chequeo = new Date(ms);
  if (
    chequeo.getFullYear() !== anio ||
    chequeo.getMonth() !== mes - 1 ||
    chequeo.getDate() !== dia
  ) {
    return null;
  }
  return ms;
}

function segmentoTiff(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    while (i < bytes.length && bytes[i] === 0xff) i += 1;
    if (i >= bytes.length) return null;
    const marcador = bytes[i] ?? 0;
    i += 1;
    if (marcador === 0xd9 || marcador === 0xda) return null;
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) continue;
    if (i + 2 > bytes.length) return null;
    const largo = ((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0);
    if (largo < 2 || i + largo > bytes.length) return null;
    if (marcador === 0xe1) {
      const carga = bytes.subarray(i + 2, i + largo);
      if (
        carga.length >= 6 &&
        carga[0] === 0x45 &&
        carga[1] === 0x78 &&
        carga[2] === 0x69 &&
        carga[3] === 0x66 &&
        carga[4] === 0 &&
        carga[5] === 0
      ) {
        return carga.slice(6);
      }
    }
    i += largo;
  }
  return null;
}

interface Lector {
  bytes: Uint8Array;
  view: DataView;
  le: boolean;
}

function leerTiff(tiff: Uint8Array): ExifLeido {
  if (tiff.length < 8) return { ...VACIO };
  const le = tiff[0] === 0x49 && tiff[1] === 0x49;
  const be = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!le && !be) return { ...VACIO };
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  if (view.getUint16(2, le) !== 42) return { ...VACIO };
  const salida: ExifLeido = { ...VACIO };
  const vistos = new Set<number>();
  const lector: Lector = { bytes: tiff, view, le };
  const inicio = view.getUint32(4, le);
  leerIfd(lector, inicio, 0, vistos, salida);
  return salida;
}

function leerIfd(
  lector: Lector,
  offset: number,
  profundidad: number,
  vistos: Set<number>,
  salida: ExifLeido,
): void {
  if (profundidad > 3 || vistos.has(offset)) return;
  if (offset < 0 || offset + 2 > lector.bytes.length) return;
  vistos.add(offset);
  const cantidad = lector.view.getUint16(offset, lector.le);
  if (cantidad > 64) return;
  for (let i = 0; i < cantidad; i += 1) {
    const entrada = offset + 2 + i * 12;
    if (entrada + 12 > lector.bytes.length) return;
    const etiqueta = lector.view.getUint16(entrada, lector.le);
    const tipo = lector.view.getUint16(entrada + 2, lector.le);
    const cuenta = lector.view.getUint32(entrada + 4, lector.le);
    const valorEn = entrada + 8;
    if (etiqueta === MARCA_EXIF && tipo === 4 && cuenta >= 1) {
      const sub = lector.view.getUint32(valorEn, lector.le);
      leerIfd(lector, sub, profundidad + 1, vistos, salida);
      continue;
    }
    if (tipo !== 2) continue;
    if (
      etiqueta !== MARCA_MAKE &&
      etiqueta !== MARCA_MODEL &&
      etiqueta !== MARCA_FECHA
    ) {
      continue;
    }
    const texto = leerAscii(lector, valorEn, cuenta);
    if (texto === null) continue;
    if (etiqueta === MARCA_MAKE && salida.fabricante === null) {
      salida.fabricante = texto.slice(0, 64);
    } else if (etiqueta === MARCA_MODEL && salida.modelo === null) {
      salida.modelo = texto.slice(0, 64);
    } else if (etiqueta === MARCA_FECHA && salida.fechaOriginal === null) {
      salida.fechaOriginal = fechaExifAMilisegundos(texto);
    }
  }
}

function leerAscii(
  lector: Lector,
  valorEn: number,
  cuenta: number,
): string | null {
  if (cuenta <= 0 || cuenta > 128) return null;
  const tam = 1;
  let inicio = valorEn;
  if (cuenta * tam > 4) {
    if (valorEn + 4 > lector.bytes.length) return null;
    inicio = lector.view.getUint32(valorEn, lector.le);
  }
  if (inicio < 0 || inicio + cuenta > lector.bytes.length) return null;
  let texto = "";
  for (let i = 0; i < cuenta; i += 1) {
    const b = lector.bytes[inicio + i] ?? 0;
    if (b === 0) break;
    texto += String.fromCharCode(b);
  }
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : null;
}
