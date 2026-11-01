import { VERSION_ESTADO, completarEstado, type EstadoDemo } from "./estado";

/** Lo que el adaptador usa de `localStorage`; en pruebas se sustituye. */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

/** Clave versionada: si cambia la forma del estado, los datos viejos se ignoran. */
export const CLAVE_ESTADO = `agua-eucalipto:demo:v${VERSION_ESTADO}`;

/**
 * `localStorage` si el navegador deja usarlo; `null` si no existe o está
 * bloqueado (modo privado, permisos), y entonces el demo vive en memoria.
 */
export function almacenDelNavegador(): Almacen | null {
  try {
    const almacen = globalThis.localStorage;
    if (almacen === undefined || almacen === null) {
      return null;
    }
    const prueba = `${CLAVE_ESTADO}:prueba`;
    almacen.setItem(prueba, "1");
    almacen.removeItem(prueba);
    return almacen;
  } catch {
    return null;
  }
}

function pareceEstado(valor: unknown): valor is EstadoDemo {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const estado = valor as Partial<EstadoDemo>;
  return (
    estado.version === VERSION_ESTADO &&
    Array.isArray(estado.casas) &&
    Array.isArray(estado.folios) &&
    Array.isArray(estado.viajes) &&
    Array.isArray(estado.eventos) &&
    typeof estado.sesion === "object" &&
    typeof estado.siguiente_id === "number"
  );
}

/**
 * Estado guardado, o `null` si no hay o no sirve. Lanza si el almacén falla,
 * para que quien llama deje de usarlo.
 */
export function leerEstado(almacen: Almacen): EstadoDemo | null {
  const texto = almacen.getItem(CLAVE_ESTADO);
  if (texto === null) {
    return null;
  }
  try {
    const valor: unknown = JSON.parse(texto);
    return pareceEstado(valor) ? completarEstado(valor) : null;
  } catch {
    return null;
  }
}

/** Lanza si el almacén falla (lleno o bloqueado). */
export function guardarEstado(almacen: Almacen, estado: EstadoDemo): void {
  almacen.setItem(CLAVE_ESTADO, JSON.stringify(estado));
}
