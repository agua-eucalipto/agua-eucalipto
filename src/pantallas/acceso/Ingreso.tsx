import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { MotivoSolicitud } from "../../api";
import { refrescarSesion, api } from "../../app/servicios";
import { Aviso, Boton, CampoGrande, Icono } from "../../componentes";
import { normalizarTelefono } from "../../dominio";
import { acceso } from "../../textos";
import { cargarCasas } from "./casas";
import { Capa } from "./Capa";

type Vista = "otra_calle" | "telefono" | "pin" | "crear" | "casa" | "excepcion";

const t = acceso;

/** `3312345678` → `33 1234 5678` (mientras se escribe). */
export function formatearTelefono(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

function soloDigitos(texto: string, max: number): string {
  return texto.replace(/\D/g, "").slice(0, max);
}

/** Campo de PIN: 4 números, escondidos, con teclado numérico. */
function CampoPin({
  id,
  etiqueta,
  ayuda,
  valor,
  onInput,
  error,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  valor: string;
  onInput: (v: string) => void;
  error?: string;
}) {
  const ids = [ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div class="campo">
      <label class="campo__etiqueta" for={id}>
        {etiqueta}
      </label>
      {ayuda ? (
        <p class="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      ) : null}
      <input
        class="campo__entrada"
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={valor}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={ids || undefined}
        onInput={(e) =>
          onInput(soloDigitos((e.currentTarget as HTMLInputElement).value, 4))
        }
      />
      {error ? (
        <p class="campo__error" id={`${id}-error`} role="alert">
          <Icono nombre="alerta" chico />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Formulario({
  alEnviar,
  children,
}: {
  alEnviar: () => void;
  children: ComponentChildren;
}) {
  return (
    <form
      class="formulario"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        alEnviar();
      }}
    >
      {children}
    </form>
  );
}

/** Pantalla «Solicitud enviada» (A-02): sin teléfonos ni más botones. */
function Enviada() {
  return (
    <Capa titulo={t.enviada.titulo} tamano="ancha">
      <Aviso tono="info">{t.enviada.texto}</Aviso>
      <p class="nota">{t.enviada.demo}</p>
    </Capa>
  );
}

/**
 * Acceso simulado (A-01 a A-03). Se muestra cuando no hay sesión (p. ej. «Ver
 * como: Vecino de otra calle»): empieza por el rechazo de la calle y el camino
 * de excepción; desde ahí se puede entrar con teléfono + PIN + casa.
 */
export function Ingreso({ pendiente }: { pendiente: boolean }) {
  const [vista, setVista] = useState<Vista>("otra_calle");
  const [telefono, setTelefono] = useState("");
  const [pin, setPin] = useState("");
  const [repite, setRepite] = useState("");
  const [casaTexto, setCasaTexto] = useState("");
  const [motivo, setMotivo] = useState<MotivoSolicitud>(
    "casa_fuera_de_catalogo",
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [casas, setCasas] = useState<readonly string[]>([]);

  useEffect(() => {
    void cargarCasas().then(setCasas);
  }, []);

  if (pendiente) return <Enviada />;

  const error = (campo: string) => errores[campo];
  const fallo = (campo: string, texto: string) =>
    setErrores({ [campo]: texto });
  const ir = (v: Vista) => {
    setErrores({});
    setVista(v);
  };

  async function entrar(pinFinal: string, casa?: string) {
    setOcupado(true);
    try {
      const r = await api.ingresar(
        normalizarTelefono(telefono) ?? "",
        pinFinal,
        casa,
      );
      if (r.ok) {
        await refrescarSesion();
        return;
      }
      switch (r.error) {
        case "CASA_NO_EXISTE":
          if (casa === undefined) ir("crear");
          else fallo("casa", t.ingreso.casa.noExiste);
          break;
        case "CASA_OTRA_CALLE":
          ir("otra_calle");
          break;
        case "TELEFONO_INVALIDO":
          setMotivo("telefono_fuera_de_lista");
          ir("excepcion");
          break;
        case "PIN_INCORRECTO":
          fallo("pin", t.ingreso.pin.incorrecto);
          break;
        case "PIN_INVALIDO":
          fallo("pin", t.ingreso.pin.invalido);
          break;
        case "BLOQUEADO":
          fallo("pin", t.ingreso.pin.bloqueado);
          break;
        default:
          fallo("general", t.errorGeneral);
      }
    } finally {
      setOcupado(false);
    }
  }

  async function pedirAcceso() {
    const texto = casaTexto.trim();
    const numero = normalizarTelefono(telefono);
    if (numero === null) return fallo("telefono", t.ingreso.telefono.invalido);
    if (texto === "") return fallo("casa", t.excepcion.casaVacia);
    setOcupado(true);
    try {
      const r = await api.solicitar_acceso(numero, texto, motivo);
      if (r.ok) {
        await refrescarSesion();
        return;
      }
      if (r.error === "CASA_OTRA_CALLE") {
        fallo("casa", t.excepcion.calleNoParticipa);
      } else if (r.error === "TELEFONO_INVALIDO") {
        fallo("telefono", t.ingreso.telefono.invalido);
      } else {
        fallo("general", t.errorGeneral);
      }
    } finally {
      setOcupado(false);
    }
  }

  const general = error("general");
  const avisoGeneral = general ? <Aviso tono="error">{general}</Aviso> : null;

  if (vista === "otra_calle") {
    return (
      <Capa titulo={t.otraCalle.titulo} tamano="ancha">
        <p class="capa__texto">{t.otraCalle.texto}</p>
        <div class="acciones acciones--capa">
          <Boton variante="primario" focoInicial onClick={() => ir("telefono")}>
            {t.otraCalle.soyDeEucalipto}
          </Boton>
          <Boton
            onClick={() => {
              setMotivo("casa_fuera_de_catalogo");
              ir("excepcion");
            }}
          >
            {t.otraCalle.pedirExcepcion}
          </Boton>
        </div>
        <p class="nota">{t.otraCalle.demo}</p>
      </Capa>
    );
  }

  if (vista === "telefono") {
    return (
      <Capa titulo={t.ingreso.titulo} tamano="ancha">
        <Formulario
          alEnviar={() => {
            if (normalizarTelefono(telefono) === null) {
              return fallo("telefono", t.ingreso.telefono.invalido);
            }
            ir("pin");
          }}
        >
          <CampoGrande
            id="acceso-telefono"
            etiqueta={t.ingreso.telefono.etiqueta}
            ayuda={t.ingreso.telefono.ayuda}
            valor={telefono}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="33 1234 5678"
            error={error("telefono")}
            onInput={(v) => setTelefono(formatearTelefono(v))}
          />
          <div class="acciones acciones--capa">
            <Boton variante="primario" type="submit">
              {t.ingreso.telefono.continuar}
            </Boton>
            <Boton variante="texto" onClick={() => ir("otra_calle")}>
              {t.ingreso.atras}
            </Boton>
          </div>
        </Formulario>
      </Capa>
    );
  }

  if (vista === "pin") {
    return (
      <Capa titulo={t.ingreso.titulo} tamano="ancha">
        {avisoGeneral}
        <Formulario
          alEnviar={() => {
            if (pin.length !== 4) return fallo("pin", t.ingreso.pin.invalido);
            void entrar(pin);
          }}
        >
          <CampoPin
            id="acceso-pin"
            etiqueta={t.ingreso.pin.etiquetaEntrar}
            valor={pin}
            error={error("pin")}
            onInput={setPin}
          />
          <div class="acciones acciones--capa">
            <Boton variante="primario" type="submit" deshabilitado={ocupado}>
              {t.ingreso.pin.entrar}
            </Boton>
            <Boton variante="texto" onClick={() => ir("telefono")}>
              {t.ingreso.atras}
            </Boton>
          </div>
        </Formulario>
      </Capa>
    );
  }

  if (vista === "crear") {
    return (
      <Capa titulo={t.ingreso.pin.tituloCrear} tamano="ancha">
        <Formulario
          alEnviar={() => {
            if (pin.length !== 4) return fallo("pin", t.ingreso.pin.invalido);
            if (repite !== pin) return fallo("repite", t.ingreso.pin.distinto);
            ir("casa");
          }}
        >
          <CampoPin
            id="acceso-pin-nuevo"
            etiqueta={t.ingreso.pin.etiquetaCrear}
            ayuda={t.ingreso.pin.ayuda}
            valor={pin}
            error={error("pin")}
            onInput={setPin}
          />
          <CampoPin
            id="acceso-pin-repite"
            etiqueta={t.ingreso.pin.etiquetaRepetir}
            valor={repite}
            error={error("repite")}
            onInput={setRepite}
          />
          <div class="acciones acciones--capa">
            <Boton variante="primario" type="submit">
              {t.ingreso.telefono.continuar}
            </Boton>
            <Boton variante="texto" onClick={() => ir("pin")}>
              {t.ingreso.atras}
            </Boton>
          </div>
        </Formulario>
      </Capa>
    );
  }

  if (vista === "casa") {
    return (
      <Capa titulo={t.ingreso.casa.titulo} tamano="ancha">
        {avisoGeneral}
        {error("casa") ? <Aviso tono="error">{error("casa")}</Aviso> : null}
        <div class="casas" role="group" aria-label={t.ingreso.casa.region}>
          {casas.map((n) => (
            <button
              key={n}
              type="button"
              class="casa-boton"
              aria-label={t.ingreso.casa.numero(n)}
              aria-disabled={ocupado ? "true" : undefined}
              onClick={() => {
                if (!ocupado) void entrar(pin, n);
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div class="acciones acciones--capa">
          <Boton
            variante="texto"
            onClick={() => {
              setMotivo("casa_fuera_de_catalogo");
              ir("excepcion");
            }}
          >
            {t.ingreso.casa.noEstaEnLista}
          </Boton>
        </div>
      </Capa>
    );
  }

  // excepcion: teléfono fuera de lista (A-02) o casa fuera del catálogo (A-02/A-03)
  const fueraDeLista = motivo === "telefono_fuera_de_lista";
  return (
    <Capa
      titulo={fueraDeLista ? t.ingreso.pedirAcceso : t.excepcion.titulo}
      tamano="ancha"
    >
      <p class="capa__texto">
        {fueraDeLista ? t.ingreso.telefonoFueraDeLista : t.excepcion.ayuda}
      </p>
      {avisoGeneral}
      <Formulario alEnviar={() => void pedirAcceso()}>
        <CampoGrande
          id="excepcion-telefono"
          etiqueta={t.ingreso.telefono.etiqueta}
          valor={telefono}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="33 1234 5678"
          error={error("telefono")}
          onInput={(v) => setTelefono(formatearTelefono(v))}
        />
        <CampoGrande
          id="excepcion-casa"
          etiqueta={t.excepcion.casaEtiqueta}
          ayuda={t.excepcion.casaAyuda}
          valor={casaTexto}
          autoCapitalize="words"
          error={error("casa")}
          onInput={setCasaTexto}
        />
        <div class="acciones acciones--capa">
          <Boton variante="primario" type="submit" deshabilitado={ocupado}>
            {t.excepcion.enviar}
          </Boton>
          <Boton variante="texto" onClick={() => ir("otra_calle")}>
            {t.ingreso.atras}
          </Boton>
        </div>
      </Formulario>
    </Capa>
  );
}
