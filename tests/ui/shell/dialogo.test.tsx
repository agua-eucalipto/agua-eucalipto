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
});
