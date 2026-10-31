import { signal } from "@preact/signals";

/** Clave propia en `localStorage` para recordar que ya se vio la introducción. */
export const CLAVE_PRIMERA_VEZ = "agua-eucalipto:introduccion-vista";

export type FaseIntroduccion = "aviso" | "tutorial" | null;

/** Qué parte de la introducción se muestra ahora (`null` = ninguna). */
export const fase = signal<FaseIntroduccion>(null);
/** `true` cuando se abrió desde ⓘ: se puede cerrar con Escape y no lleva a acceso. */
export const repaso = signal(false);

export function yaVioIntroduccion(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_PRIMERA_VEZ) === "1";
  } catch {
    return false;
  }
}

export function recordarIntroduccion(): void {
  try {
    window.localStorage.setItem(CLAVE_PRIMERA_VEZ, "1");
  } catch {
    /* sin almacenamiento: se vuelve a mostrar la próxima vez */
  }
}

/** Primera vez en este navegador: empieza por el aviso. */
export function iniciarIntroduccion(): void {
  if (yaVioIntroduccion()) return;
  repaso.value = false;
  fase.value = "aviso";
}

/** Desde ⓘ: vuelve a mostrar el aviso y el tutorial. */
export function verIntroduccionOtraVez(): void {
  repaso.value = true;
  fase.value = "aviso";
}

export function pasarAlTutorial(): void {
  fase.value = "tutorial";
}

export function terminarIntroduccion(): void {
  if (!repaso.value) recordarIntroduccion();
  fase.value = null;
  repaso.value = false;
}
