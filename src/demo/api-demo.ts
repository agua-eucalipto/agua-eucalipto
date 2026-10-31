import { ApiMemoria, CLAVE_ESTADO, type Almacen } from "../api/memoria";
import { almacenDelNavegador } from "../api/memoria/persistencia";
import { sembrar } from "./semilla";

export interface OpcionesApiDemo {
  /**
   * Dónde se guarda el demo. Por omisión, `localStorage` si se puede usar;
   * `null` para no guardar nada (siempre arranca con los datos de ejemplo).
   */
  almacenamiento?: Almacen | null;
}

function hayEstadoGuardado(almacen: Almacen | null): boolean {
  try {
    return almacen?.getItem(CLAVE_ESTADO) != null;
  } catch {
    return false;
  }
}

/**
 * La `Api` del demo lista para usarse: reinicia con los datos de ejemplo y,
 * si aún no hay nada guardado, los carga. `demo_ver_como`,
 * `demo_adelantar_reloj` y `demo_reiniciar` son los del adaptador en memoria.
 */
export async function crearApiDemo(
  opciones: OpcionesApiDemo = {},
): Promise<ApiMemoria> {
  const almacenamiento =
    opciones.almacenamiento === undefined
      ? almacenDelNavegador()
      : opciones.almacenamiento;
  const hayGuardado = hayEstadoGuardado(almacenamiento);
  const api = new ApiMemoria({ almacenamiento, semilla: sembrar });
  if (!hayGuardado) {
    await api.demo_reiniciar();
  }
  return api;
}
