# Suite de escenarios

Pruebas del contrato `Api` (`src/api/contrato.ts`) que sirven para cualquier implementación. Cada escenario arranca con una `Api` nueva, sin datos y sin sesión, y su nombre empieza con el ID de la regla que prueba (`F-03 · tope de 2 activos por canal`).

- `fabrica.ts` es el único archivo que conoce la implementación bajo prueba: `crearApi()` devuelve la `Api`, el reloj controlado, `entrarComo(casa | "coordinador")` y las capacidades opcionales (`pin_verificado`). Para probar otra implementación solo se cambia este archivo.
- `mundo.ts` define el mundo mínimo que debe existir al arrancar: casas 1 a 25, una lista blanca de teléfonos ficticios y un coordinador (casa 3).
- `escenario.ts` registra los escenarios; `utiles.ts` trae las ayudas para escribirlos.
- `reglas.txt` lista los IDs de regla que deben aparecer en algún nombre de escenario. Se comprueba con:

```bash
node tests/escenarios/verificar-cobertura.mjs
```
