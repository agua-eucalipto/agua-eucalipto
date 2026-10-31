// @vitest-environment happy-dom
import { render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { PantallaSiapa } from "../../../src/pantallas/siapa";
import { comun } from "../../../src/textos";

describe("pantallas", () => {
  it("se pintan en un DOM de prueba", () => {
    render(<PantallaSiapa />);
    expect(screen.getByText(comun.vacias.siapa)).toBeTruthy();
  });
});
