// Verifica que cada regla de reglas.txt aparezca en el nombre de algún escenario.
// Uso: node tests/escenarios/verificar-cobertura.mjs [archivo-de-ids]
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = dirname(fileURLToPath(import.meta.url));
const archivoIds = process.argv[2] ?? join(carpeta, "reglas.txt");

const reglas = readFileSync(archivoIds, "utf8")
  .split("\n")
  .map((linea) => linea.trim())
  .filter((linea) => linea !== "" && !linea.startsWith("#"));

const PATRON_NOMBRE = /escenario\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
const nombres = [];
for (const archivo of readdirSync(carpeta).filter((f) =>
  f.endsWith(".test.ts"),
)) {
  const texto = readFileSync(join(carpeta, archivo), "utf8");
  for (const coincidencia of texto.matchAll(PATRON_NOMBRE)) {
    nombres.push({ archivo, nombre: coincidencia[2] });
  }
}

const menciona = (nombre, id) =>
  new RegExp(`(?<![A-Za-z0-9-])${id}(?![A-Za-z0-9-])`).test(nombre);

let fallo = false;
console.log(
  `escenarios: ${nombres.length} | reglas en ${archivoIds}: ${reglas.length}`,
);
const sinCubrir = [];
for (const id of reglas) {
  const cuantos = nombres.filter(({ nombre }) => menciona(nombre, id)).length;
  console.log(`${id.padEnd(8)} ${cuantos}`);
  if (cuantos === 0) {
    sinCubrir.push(id);
  }
}

const CON_FORMATO_DE_REGLA =
  /(?<![A-Za-z0-9-])(?:[FCPA]-\d{2}|G-INV-\d)(?![A-Za-z0-9-])/g;
const desconocidas = new Set();
for (const { nombre } of nombres) {
  for (const id of nombre.match(CON_FORMATO_DE_REGLA) ?? []) {
    if (!reglas.includes(id)) {
      desconocidas.add(id);
    }
  }
}
const sinId = nombres.filter(
  ({ nombre }) => !reglas.some((id) => nombre.startsWith(id)),
);

console.log(`reglas sin escenario: ${sinCubrir.join(", ") || "ninguna"}`);
console.log(
  `IDs desconocidos en nombres: ${[...desconocidas].join(", ") || "ninguno"}`,
);
console.log(
  `escenarios que no empiezan con un ID: ${sinId.map((s) => s.nombre).join(" | ") || "ninguno"}`,
);
fallo = sinCubrir.length > 0 || desconocidas.size > 0 || sinId.length > 0;
process.exit(fallo ? 1 : 0);
