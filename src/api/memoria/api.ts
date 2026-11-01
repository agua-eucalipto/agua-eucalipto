import { HORA_MS } from "../../dominio";
import {
  adelantar as adelantarReloj,
  ahora,
  reiniciar as reiniciarReloj,
} from "../../reloj";
import type {
  Api,
  ApiDemo,
  CambiosViaje,
  DatosAbrirViaje,
  MotivoSolicitud,
  OpcionesListaCaseta,
  PerfilDemo,
  Resultado,
  ResultadoEntrega,
} from "../contrato";
import * as acceso from "./acceso";
import { barrer } from "./barrido";
import { bitacora } from "./bitacora";
import { generarListaCaseta } from "./caseta";
import {
  CATALOGO_DEMO,
  crearEstadoInicial,
  type Catalogo,
  type EstadoDemo,
} from "./estado";
import * as folios from "./folios";
import {
  almacenDelNavegador,
  guardarEstado,
  leerEstado,
  type Almacen,
} from "./persistencia";
import { Transaccion, exito, falla } from "./transaccion";
import * as viajes from "./viajes";

export interface OpcionesApiMemoria {
  /** Catálogo con el que arranca y al que regresa `demo_reiniciar`. */
  catalogo?: Catalogo;
  /**
   * Dónde guardar el estado. Por omisión, `localStorage` si se puede usar;
   * `null` para no guardar nada.
   */
  almacenamiento?: Almacen | null;
  /** Se ejecuta después de `demo_reiniciar` para cargar los datos de ejemplo. */
  semilla?: (api: ApiMemoria) => Promise<void>;
}

/**
 * Adaptador del demo: aplica todas las reglas en el navegador y guarda el
 * estado en `localStorage`. Si el almacenamiento no está disponible o falla,
 * sigue funcionando en memoria (`persistente` pasa a `false`).
 *
 * Cada operación: carga el estado, corre el barrido con el `ahora` del reloj,
 * aplica la regla sobre una copia y, solo si tuvo éxito, la adopta y la
 * guarda. Un rechazo no deja rastro. Lo que devuelve es siempre una copia.
 */
export class ApiMemoria implements Api, ApiDemo {
  #estado: EstadoDemo;
  #almacen: Almacen | null;
  readonly #catalogo: Catalogo;
  readonly #semilla: OpcionesApiMemoria["semilla"];

  constructor(opciones: OpcionesApiMemoria = {}) {
    this.#catalogo = opciones.catalogo ?? CATALOGO_DEMO;
    this.#semilla = opciones.semilla;
    this.#almacen =
      opciones.almacenamiento === undefined
        ? almacenDelNavegador()
        : opciones.almacenamiento;
    const guardado = this.#leerGuardado();
    if (guardado !== null && guardado.desfase_reloj_ms > 0) {
      adelantarReloj(guardado.desfase_reloj_ms);
    }
    this.#estado = guardado ?? crearEstadoInicial(this.#catalogo, ahora());
  }

  /** `false` si el demo no se guardará al cerrar. */
  get persistente(): boolean {
    return this.#almacen !== null;
  }

  // Sesión y acceso

  sesion_actual() {
    return this.#leer((tx) => acceso.sesionActual(tx));
  }

  ingresar(telefono: string, pin: string, casa?: string) {
    return this.#escribir((tx) => acceso.ingresar(tx, telefono, pin, casa));
  }

  solicitar_acceso(
    telefono: string,
    casa_texto: string,
    motivo: MotivoSolicitud,
  ) {
    return this.#escribir((tx) =>
      acceso.solicitarAcceso(tx, telefono, casa_texto, motivo),
    );
  }

  // Folios

  listar_folios_casa() {
    return this.#leer((tx) => folios.listarFoliosCasa(tx));
  }

  registrar_folio(codigo: string, reemplaza_folio_id?: string) {
    return this.#escribir((tx) =>
      folios.registrarFolio(tx, codigo, reemplaza_folio_id),
    );
  }

  marcar_sigue_pendiente(folio_id: string) {
    return this.#escribir((tx) => folios.marcarSiguePendiente(tx, folio_id));
  }

  marcar_surtido(folio_id: string, quemar_otros: boolean) {
    return this.#escribir((tx) =>
      folios.marcarSurtido(tx, folio_id, quemar_otros),
    );
  }

  marcar_sin_surtir(folio_id: string) {
    return this.#escribir((tx) => folios.marcarSinSurtir(tx, folio_id));
  }

  // Pipas

  listar_viajes() {
    return this.#leer((tx) => viajes.listarViajes(tx));
  }

  listar_espera() {
    return this.#leer((tx) => viajes.listarEspera(tx));
  }

  abrir_viaje(datos: DatosAbrirViaje) {
    return this.#escribir((tx) => viajes.abrirViaje(tx, datos));
  }

  editar_viaje(viaje_id: string, cambios: CambiosViaje) {
    return this.#escribir((tx) => viajes.editarViaje(tx, viaje_id, cambios));
  }

  anotarse(viaje_id: string) {
    return this.#escribir((tx) => viajes.anotarse(tx, viaje_id));
  }

  anotarse_cualquiera() {
    return this.#escribir((tx) => viajes.anotarseCualquiera(tx));
  }

  dar_de_baja(viaje_id: string) {
    return this.#escribir((tx) => viajes.darDeBaja(tx, viaje_id));
  }

  marcar_pedida(viaje_id: string, eta_texto: string) {
    return this.#escribir((tx) => viajes.marcarPedida(tx, viaje_id, eta_texto));
  }

  marcar_ya_paso(viaje_id: string) {
    return this.#escribir((tx) => viajes.marcarYaPaso(tx, viaje_id));
  }

  confirmar_entrega(viaje_id: string, resultado: ResultadoEntrega) {
    return this.#escribir((tx) =>
      viajes.confirmarEntrega(tx, viaje_id, resultado),
    );
  }

  tomar_responsabilidad(viaje_id: string, acepta_responsabilidad: true) {
    return this.#escribir((tx) =>
      viajes.tomarResponsabilidad(tx, viaje_id, acepta_responsabilidad),
    );
  }

  cancelar_viaje(viaje_id: string) {
    return this.#escribir((tx) => viajes.cancelarViaje(tx, viaje_id));
  }

  salir_de_espera() {
    return this.#escribir((tx) => viajes.salirDeEspera(tx));
  }

  // Coordinador

  generar_lista_caseta(opciones: OpcionesListaCaseta) {
    return this.#escribir((tx) => generarListaCaseta(tx, opciones));
  }

  listar_solicitudes() {
    return this.#leer((tx) => acceso.listarSolicitudes(tx));
  }

  resolver_solicitud(id: string, aprobar: boolean, casa_asignada?: string) {
    return this.#escribir((tx) =>
      acceso.resolverSolicitud(tx, id, aprobar, casa_asignada),
    );
  }

  listar_telefonos() {
    return this.#leer((tx) => acceso.listarTelefonos(tx));
  }

  reiniciar_telefono(telefono: string) {
    return this.#escribir((tx) => acceso.reiniciarTelefono(tx, telefono));
  }

  // Información

  bitacora(antes_de_id?: number, limite?: number) {
    return this.#leer((tx) => bitacora(tx, antes_de_id, limite));
  }

  // Demo

  demo_ver_como(perfil: PerfilDemo, casa?: string) {
    return this.#escribir((tx) => acceso.verComo(tx, perfil, casa));
  }

  async demo_adelantar_reloj(horas = 24) {
    if (!Number.isFinite(horas) || horas <= 0) {
      return falla("DATOS_INVALIDOS");
    }
    const ms = horas * HORA_MS;
    adelantarReloj(ms);
    return this.#escribir((tx) => {
      tx.estado.desfase_reloj_ms += ms;
      tx.evento("demo_reloj_adelantado", { horas });
      return exito({ ahora: tx.ahora });
    });
  }

  async demo_reiniciar(): Promise<Resultado<void>> {
    reiniciarReloj();
    this.#estado = crearEstadoInicial(this.#catalogo, ahora());
    this.#guardar();
    await this.#semilla?.(this);
    return exito(undefined);
  }

  // Ejecución

  #leer<T>(operacion: (tx: Transaccion) => Resultado<T>) {
    return this.#ejecutar(operacion, false);
  }

  #escribir<T>(operacion: (tx: Transaccion) => Resultado<T>) {
    return this.#ejecutar(operacion, true);
  }

  async #ejecutar<T>(
    operacion: (tx: Transaccion) => Resultado<T>,
    escribe: boolean,
  ): Promise<Resultado<T>> {
    const instante = ahora();
    this.#estado = this.#leerGuardado() ?? this.#estado;
    if (barrer(new Transaccion(this.#estado, instante)) > 0) {
      this.#guardar();
    }
    if (!escribe) {
      return structuredClone(
        operacion(new Transaccion(this.#estado, instante)),
      );
    }
    const borrador = structuredClone(this.#estado);
    const resultado = operacion(new Transaccion(borrador, instante));
    if (resultado.ok) {
      this.#estado = borrador;
      this.#guardar();
    }
    return structuredClone(resultado);
  }

  #leerGuardado(): EstadoDemo | null {
    if (this.#almacen === null) {
      return null;
    }
    try {
      return leerEstado(this.#almacen);
    } catch {
      this.#almacen = null;
      return null;
    }
  }

  #guardar(): void {
    if (this.#almacen === null) {
      return;
    }
    try {
      guardarEstado(this.#almacen, this.#estado);
    } catch {
      this.#almacen = null;
    }
  }
}
