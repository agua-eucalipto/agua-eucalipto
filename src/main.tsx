import { render } from "preact";

const contenedor = document.getElementById("app");

if (!contenedor) {
  throw new Error("No se encontró el elemento de la aplicación.");
}

render(<h1>Agua Eucalipto · en construcción</h1>, contenedor);
