import { signal } from "@preact/signals";
import { ApiMemoria } from "../api/memoria";
import type { Api, ApiDemo, Sesion } from "../api";
import { ahora } from "../reloj";

/**
 * Punto de conexión con el adaptador. La semilla de datos de ejemplo la aporta
 * la sesión de `src/demo` (opción `semilla` de `ApiMemoria`); aquí se enchufa.
 */
const instancia = new ApiMemoria();

export const api: Api = instancia;
export const apiDemo: ApiDemo = instancia;

export const sesion = signal<Sesion>({ casa: null, rol: "sin_sesion" });
/** Milisegundos del reloj simulado; cambia al adelantar o reiniciar. */
export const reloj = signal<number>(ahora());

export const DIA_MS = 24 * 60 * 60 * 1000;

/** Días que el reloj simulado lleva de adelanto sobre el real. */
export function diasAdelantados(): number {
  return Math.max(0, Math.round((reloj.value - Date.now()) / DIA_MS));
}

export async function refrescarSesion(): Promise<void> {
  const r = await api.sesion_actual();
  if (r.ok) sesion.value = r.datos;
  reloj.value = ahora();
}

export async function verComo(
  perfil: "vecino" | "coordinador" | "otra_calle",
  casa?: string,
) {
  const r = await apiDemo.demo_ver_como(perfil, casa);
  if (r.ok) sesion.value = r.datos;
  return r;
}

/**
 * Sin pantalla de acceso todavía: si no hay sesión, el demo arranca como
 * vecino de la casa 7.
 */
export async function arrancarSesionDemo(): Promise<void> {
  await refrescarSesion();
  if (sesion.value.rol === "sin_sesion") await verComo("vecino", "7");
}

export async function adelantarUnDia() {
  const r = await apiDemo.demo_adelantar_reloj(24);
  if (r.ok) {
    reloj.value = r.datos.ahora;
  }
  return r;
}

export async function reiniciarDemo() {
  const r = await apiDemo.demo_reiniciar();
  if (r.ok) {
    await arrancarSesionDemo();
  }
  return r;
}
