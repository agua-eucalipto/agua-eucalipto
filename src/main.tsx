import { render } from "preact";
import { App } from "./app/App";
import { iniciarApi } from "./app/servicios";
import "./estilos/index.css";

const contenedor = document.getElementById("app");

if (!contenedor) {
  throw new Error("No se encontró el elemento de la aplicación.");
}

void iniciarApi().then(() => render(<App />, contenedor));
