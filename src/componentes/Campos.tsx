import type { JSX } from "preact";
import { Icono } from "./Icono";

/** Campo grande: etiqueta, ayuda, entrada de 56 px y confirmación o error. */
export function CampoGrande({
  id,
  etiqueta,
  ayuda,
  valor,
  onInput,
  error,
  confirmacion,
  inputMode,
  autoCapitalize,
  autoComplete,
  placeholder,
  deshabilitado = false,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string | readonly string[];
  valor: string;
  onInput: (valor: string) => void;
  error?: string;
  /** p. ej. "WhatsApp" cuando se detecta el canal. */
  confirmacion?: string;
  inputMode?: JSX.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: "none" | "off" | "on" | "sentences" | "words" | "characters";
  autoComplete?: string;
  placeholder?: string;
  deshabilitado?: boolean;
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
        Array.isArray(ayuda) ? (
          <ul class="campo__ayuda campo__ayuda--lista" id={`${id}-ayuda`}>
            {ayuda.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        ) : (
          <p class="campo__ayuda" id={`${id}-ayuda`}>
            {ayuda}
          </p>
        )
      ) : null}
      <input
        class="campo__entrada"
        id={id}
        value={valor}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete ?? "off"}
        autoCorrect="off"
        spellcheck={false}
        placeholder={placeholder}
        disabled={deshabilitado}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={ids || undefined}
        onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
      />
      {error ? (
        <p class="campo__error" id={`${id}-error`} role="alert">
          <Icono nombre="alerta" chico />
          {error}
        </p>
      ) : confirmacion ? (
        <p class="campo__ok" aria-live="polite">
          <Icono nombre="check" chico />
          {confirmacion}
        </p>
      ) : null}
    </div>
  );
}

/** Casilla grande: caja de 28 px dentro de una etiqueta de al menos 48 px. */
export function Casilla({
  id,
  marcada,
  onCambio,
  deshabilitada = false,
  children,
}: {
  id: string;
  marcada: boolean;
  onCambio: (marcada: boolean) => void;
  deshabilitada?: boolean;
  children: string;
}) {
  return (
    <label
      class={deshabilitada ? "casilla casilla--deshabilitada" : "casilla"}
      for={id}
    >
      <input
        type="checkbox"
        id={id}
        checked={marcada}
        disabled={deshabilitada}
        onChange={(e) =>
          onCambio((e.currentTarget as HTMLInputElement).checked)
        }
      />
      <span>{children}</span>
    </label>
  );
}
