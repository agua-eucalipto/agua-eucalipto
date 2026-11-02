// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/preact";
import { useState } from "preact/hooks";
import { describe, expect, it, vi } from "vitest";
import { Boton, Dialogo } from "../../../src/componentes";

function Contador({ onCerrar }: { onCerrar: () => void }) {
  const [n, setN] = useState(0);
  return (
    <Dialogo titulo="¿Seguimos?" onCerrar={onCerrar}>
      <p>Van {n}</p>
      <Boton focoInicial onClick={() => setN(n + 1)}>
        Sumar
      </Boton>
    </Dialogo>
  );
}

describe("Dialogo", () => {
  it("pinta en un portal, se actualiza con el padre y cierra con Escape", () => {
    const onCerrar = vi.fn();
    const app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
    const { unmount } = render(<Contador onCerrar={onCerrar} />, {
      container: app,
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(app.hasAttribute("inert")).toBe(true);
    fireEvent.click(screen.getByText("Sumar"));
    expect(screen.getByText("Van 1")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCerrar).toHaveBeenCalledOnce();

    unmount();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(app.hasAttribute("inert")).toBe(false);
    app.remove();
  });

  it("un diálogo encima deja inerte al de abajo y conserva lo escrito", () => {
    const onCerrar = vi.fn();
    const app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);

    function Anidados() {
      const [folio, setFolio] = useState("");
      const [encima, setEncima] = useState(false);
      return (
        <Dialogo titulo="Registrar folio" onCerrar={onCerrar}>
          <input
            aria-label="Folio"
            value={folio}
            onInput={(e) =>
              setFolio((e.currentTarget as HTMLInputElement).value)
            }
          />
          <Boton onClick={() => setEncima(true)}>Ver contacto</Boton>
          {encima ? (
            <Dialogo
              titulo="Contacto del SIAPA"
              onCerrar={() => setEncima(false)}
            >
              <Boton focoInicial onClick={() => setEncima(false)}>
                Cancelar
              </Boton>
            </Dialogo>
          ) : null}
        </Dialogo>
      );
    }

    const { unmount } = render(<Anidados />, { container: app });
    const campo = screen.getByLabelText("Folio") as HTMLInputElement;
    fireEvent.input(campo, { target: { value: "2403" } });
    expect(campo.value).toBe("2403");

    const abrir = screen.getByRole("button", { name: "Ver contacto" });
    abrir.focus();
    fireEvent.click(abrir);

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    const superior = screen.getByRole("dialog", { name: "Contacto del SIAPA" });
    const inferior = screen.getByRole("dialog", {
      name: "Registrar folio",
      hidden: true,
    });
    expect(inferior.parentElement?.hasAttribute("inert")).toBe(true);
    expect(inferior.parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(superior.parentElement?.hasAttribute("inert")).toBe(false);
    expect(campo.value).toBe("2403");
    expect(app.hasAttribute("inert")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCerrar).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Registrar folio" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("dialog", { name: "Contacto del SIAPA" }),
    ).toBeNull();
    expect(inferior.parentElement?.hasAttribute("inert")).toBe(false);
    expect(inferior.parentElement?.hasAttribute("aria-hidden")).toBe(false);
    expect(campo.value).toBe("2403");
    expect(document.activeElement).toBe(abrir);
    expect(app.hasAttribute("inert")).toBe(true);

    unmount();
    expect(app.hasAttribute("inert")).toBe(false);
    app.remove();
  });
});
