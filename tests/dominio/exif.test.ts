import { describe, expect, it } from "vitest";
import { fechaExifAMilisegundos, leerExif } from "../../src/dominio";
import { jpegConExif, jpegSinExif } from "../aljibe/jpeg";

const FECHA = "2026:10:30 08:15:00";

describe("leerExif", () => {
  it("lee DateTimeOriginal, Make y Model de un JPEG sintético", () => {
    const jpeg = jpegConExif({
      fecha: FECHA,
      fabricante: "ACME",
      modelo: "X1",
    });
    expect(leerExif(jpeg)).toEqual({
      fechaOriginal: fechaExifAMilisegundos(FECHA),
      fabricante: "ACME",
      modelo: "X1",
    });
  });

  it("lee el mismo EXIF en orden big-endian y con un APP0 delante", () => {
    const jpeg = jpegConExif({
      fecha: FECHA,
      fabricante: "ACMECAM",
      modelo: "X1",
      littleEndian: false,
      conApp0: true,
    });
    expect(leerExif(jpeg)).toEqual({
      fechaOriginal: fechaExifAMilisegundos(FECHA),
      fabricante: "ACMECAM",
      modelo: "X1",
    });
  });

  it("sin APP1 no hay fecha ni cámara, y un archivo corto no lanza", () => {
    expect(leerExif(jpegSinExif())).toEqual({
      fechaOriginal: null,
      fabricante: null,
      modelo: null,
    });
    expect(leerExif(new Uint8Array([1, 2, 3]))).toEqual({
      fechaOriginal: null,
      fabricante: null,
      modelo: null,
    });
    const corto = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    ]);
    expect(leerExif(corto).fechaOriginal).toBeNull();
  });

  it("una fecha que no tiene forma de EXIF queda vacía", () => {
    const jpeg = jpegConExif({
      fecha: "ayer en la tarde",
      fabricante: "ACME",
    });
    const leido = leerExif(jpeg);
    expect(leido.fechaOriginal).toBeNull();
    expect(leido.fabricante).toBe("ACME");
  });
});
