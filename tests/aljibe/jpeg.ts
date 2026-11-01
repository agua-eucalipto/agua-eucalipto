/** JPEG mínimo sintético, solo para pruebas. No es una foto real. */

interface Entrada {
  tag: number;
  tipo: number;
  count: number;
  texto?: string;
  long?: number;
}

export function jpegSinExif(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}

export function jpegConExif(opciones: {
  fecha?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  littleEndian?: boolean;
  conApp0?: boolean;
}): Uint8Array {
  const le = opciones.littleEndian !== false;
  const ifd0: Entrada[] = [];
  if (opciones.fabricante) {
    ifd0.push({ tag: 0x010f, tipo: 2, count: 0, texto: opciones.fabricante });
  }
  if (opciones.modelo) {
    ifd0.push({ tag: 0x0110, tipo: 2, count: 0, texto: opciones.modelo });
  }
  const exif: Entrada[] = [];
  if (opciones.fecha) {
    exif.push({ tag: 0x9003, tipo: 2, count: 0, texto: opciones.fecha });
  }
  // El IFD de EXIF va justo después del IFD0. El puntero cuenta esa entrada.
  const puntero = 8 + 2 + (ifd0.length + (exif.length > 0 ? 1 : 0)) * 12 + 4;
  if (exif.length > 0) {
    ifd0.push({ tag: 0x8769, tipo: 4, count: 1, long: puntero });
  }
  return envolver(construirTiff(ifd0, exif, le), opciones.conApp0 === true);
}

function construirTiff(
  ifd0: Entrada[],
  exif: Entrada[],
  le: boolean,
): Uint8Array {
  const ifd0Size = 2 + ifd0.length * 12 + 4;
  const exifSize = exif.length === 0 ? 0 : 2 + exif.length * 12 + 4;
  const exifEn = 8 + ifd0Size;
  let cursor = 8 + ifd0Size + exifSize;
  const blobs: { entrada: Entrada; offset: number }[] = [];
  const reservar = (entrada: Entrada) => {
    if (entrada.texto === undefined) return;
    entrada.count = entrada.texto.length + 1;
    if (entrada.count > 4) {
      blobs.push({ entrada, offset: cursor });
      cursor += entrada.count;
    }
  };
  for (const entrada of ifd0) reservar(entrada);
  for (const entrada of exif) reservar(entrada);

  const out = new Uint8Array(cursor);
  const view = new DataView(out.buffer);
  out[0] = le ? 0x49 : 0x4d;
  out[1] = le ? 0x49 : 0x4d;
  view.setUint16(2, 42, le);
  view.setUint32(4, 8, le);

  const escribir = (entradas: Entrada[], offset: number) => {
    view.setUint16(offset, entradas.length, le);
    entradas.forEach((entrada, i) => {
      const p = offset + 2 + i * 12;
      view.setUint16(p, entrada.tag, le);
      view.setUint16(p + 2, entrada.tipo, le);
      view.setUint32(p + 4, entrada.count, le);
      if (entrada.tipo === 4) {
        view.setUint32(p + 8, entrada.long ?? 0, le);
      } else if (entrada.texto !== undefined && entrada.count <= 4) {
        for (let c = 0; c < entrada.texto.length; c += 1) {
          out[p + 8 + c] = entrada.texto.charCodeAt(c);
        }
      } else {
        const blob = blobs.find((b) => b.entrada === entrada);
        view.setUint32(p + 8, blob?.offset ?? 0, le);
      }
    });
    view.setUint32(offset + 2 + entradas.length * 12, 0, le);
  };

  escribir(ifd0, 8);
  if (exif.length > 0) escribir(exif, exifEn);
  for (const blob of blobs) {
    const texto = blob.entrada.texto ?? "";
    for (let c = 0; c < texto.length; c += 1) {
      out[blob.offset + c] = texto.charCodeAt(c);
    }
  }
  return out;
}

function envolver(tiff: Uint8Array, conApp0: boolean): Uint8Array {
  const cabecera = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  const largo = 2 + cabecera.length + tiff.length;
  const partes: number[] = [0xff, 0xd8];
  if (conApp0) partes.push(0xff, 0xe0, 0x00, 0x02);
  partes.push(0xff, 0xe1, (largo >> 8) & 0xff, largo & 0xff, ...cabecera);
  for (const b of tiff) partes.push(b);
  partes.push(0xff, 0xd9);
  return Uint8Array.from(partes);
}

/** Fecha EXIF a partir de milisegundos, en hora local y al segundo. */
export function textoExif(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
