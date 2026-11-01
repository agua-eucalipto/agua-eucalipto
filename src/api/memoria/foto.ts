/** Tope aproximado de la data URL guardada en memoria. */
const MAX_DATA_URL = 200 * 1024;

/**
 * Data URL reducida para guardar la foto en memoria. No se sube a ningún lado.
 * Si no cabe y no se puede reducir, devuelve `null`.
 */
export async function fotoParaMemoria(
  bytes: Uint8Array,
  tipo: string,
): Promise<string | null> {
  const mime = tipo.startsWith("image/") ? tipo : (detectarMime(bytes) ?? "");
  if (mime.startsWith("image/")) {
    const directa = dataUrl(bytes, mime);
    if (directa !== null) return directa;
  }
  return reducir(bytes, "image/jpeg");
}

function detectarMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }
  return null;
}

function dataUrl(bytes: Uint8Array, mime: string): string | null {
  let binario = "";
  const paso = 0x8000;
  for (let i = 0; i < bytes.length; i += paso) {
    const trozo = bytes.subarray(i, Math.min(i + paso, bytes.length));
    binario += String.fromCharCode(...trozo);
  }
  const url = `data:${mime};base64,${btoa(binario)}`;
  return url.length <= MAX_DATA_URL ? url : null;
}

function copiar(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function reducir(
  bytes: Uint8Array,
  mime: string,
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const direccion = URL.createObjectURL(
    new Blob([copiar(bytes)], { type: mime }),
  );
  try {
    const imagen = new Image();
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve();
      imagen.onerror = () => reject(new Error("imagen"));
      imagen.src = direccion;
    });
    let escala = 1;
    let calidad = 0.8;
    for (let i = 0; i < 6; i += 1) {
      const lienzo = document.createElement("canvas");
      const ancho = Math.max(1, Math.round(imagen.naturalWidth * escala));
      const alto = Math.max(1, Math.round(imagen.naturalHeight * escala));
      lienzo.width = ancho;
      lienzo.height = alto;
      const ctx = lienzo.getContext("2d");
      if (ctx === null) return null;
      ctx.drawImage(imagen, 0, 0, ancho, alto);
      const url = lienzo.toDataURL("image/jpeg", calidad);
      if (url.length <= MAX_DATA_URL) return url;
      escala *= 0.7;
      calidad = Math.max(0.4, calidad - 0.1);
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(direccion);
  }
}
