import { render } from "preact";
import { App } from "./app/App";
import "./estilos/index.css";

const contenedor = document.getElementById("app");

if (!contenedor) {
  throw new Error("No se encontró el elemento de la aplicación.");
}

render(<App />, contenedor);
