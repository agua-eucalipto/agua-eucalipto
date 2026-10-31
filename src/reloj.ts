let desfase = 0;
let fijo: number | null = null;

/** Única fuente de "ahora" de la aplicación (milisegundos desde epoch). */
export function ahora(): number {
  return fijo ?? Date.now() + desfase;
}

export function adelantar(ms: number): void {
  if (fijo === null) {
    desfase += ms;
  } else {
    fijo += ms;
  }
}

export function fijar(ms: number): void {
  fijo = ms;
}

export function reiniciar(): void {
  desfase = 0;
  fijo = null;
}
