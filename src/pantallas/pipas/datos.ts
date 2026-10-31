import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { EsperaVista, ViajeVista } from "../../api";
import { api, reloj, sesion } from "../../app/servicios";

export interface DatosPipas {
  viajes: ViajeVista[];
  espera: EsperaVista[];
  /** Casa de la sesión con la que se leyeron los datos. */
  casa: string | null;
}

export type CargaPipas =
  | { estado: "cargando" }
  | { estado: "error" }
  | { estado: "listo"; datos: DatosPipas };

/**
 * Lee viajes y espera de la `Api` y vuelve a leer cuando cambia el reloj o la
 * sesión (adelantar un día, ver como otra casa). `recargar` sirve después de
 * cada acción; una lectura vieja nunca pisa a una más nueva.
 */
export function usarDatosPipas(): {
  carga: CargaPipas;
  recargar: () => Promise<void>;
} {
  const instante = reloj.value;
  const actual = sesion.value;
  const [carga, setCarga] = useState<CargaPipas>({ estado: "cargando" });
  const lectura = useRef(0);

  const recargar = useCallback(async () => {
    const mia = ++lectura.current;
    const casa = sesion.peek().casa;
    const [viajes, espera] = await Promise.all([
      api.listar_viajes(),
      api.listar_espera(),
    ]);
    if (mia !== lectura.current) return;
    setCarga(
      viajes.ok && espera.ok
        ? {
            estado: "listo",
            datos: { viajes: viajes.datos, espera: espera.datos, casa },
          }
        : { estado: "error" },
    );
  }, []);

  useEffect(() => {
    void recargar();
  }, [instante, actual, recargar]);

  return { carga, recargar };
}
