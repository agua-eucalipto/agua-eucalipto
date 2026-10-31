import { cleanup } from "@testing-library/preact";
import { afterEach, beforeEach } from "vitest";
import {
  api,
  apiDemo,
  iniciarApi,
  sesion,
  verComo,
} from "../../../src/app/servicios";
import { CLAVE_PRIMERA_VEZ } from "../../../src/pantallas/acceso/estado";
import { fase, repaso } from "../../../src/pantallas/acceso/estado";

export { api, apiDemo, sesion, verComo };

/** Arranca cada prueba con la semilla limpia y sin nada guardado en el navegador. */
export function prepararDemo(opciones: { introduccionVista: boolean }) {
  beforeEach(async () => {
    window.localStorage.clear();
    if (opciones.introduccionVista) {
      window.localStorage.setItem(CLAVE_PRIMERA_VEZ, "1");
    }
    fase.value = null;
    repaso.value = false;
    await iniciarApi();
    await verComo("vecino", "7");
  });
  afterEach(() => {
    cleanup();
    fase.value = null;
    repaso.value = false;
    document.body.innerHTML = '<div id="app"></div>';
  });
}

/** Teléfonos y folios reales de la semilla, para comprobar que nunca se filtran. */
export async function datosSensibles(): Promise<{
  telefonos: string[];
  folios: string[];
}> {
  await verComo("coordinador");
  const t = await api.listar_telefonos();
  const telefonos = t.ok ? t.datos.map((x) => x.numero) : [];
  const folios: string[] = [];
  for (let n = 1; n <= 25; n += 1) {
    await verComo("vecino", String(n));
    const f = await api.listar_folios_casa();
    if (f.ok) folios.push(...f.datos.map((x) => x.codigo));
  }
  await verComo("vecino", "7");
  return { telefonos, folios };
}
