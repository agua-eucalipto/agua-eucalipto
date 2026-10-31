# Adaptador Supabase

Todavía no tiene código. Esta carpeta guardará la implementación de la interfaz `Api` (`src/api/contrato.ts`) sobre Supabase, para la versión con datos reales.

## Plan

- **Un método, una función remota.** Cada método de `Api` llama `supabase.rpc('<nombre>', args)` con el mismo nombre y los mismos argumentos. El adaptador solo traduce la respuesta a `Resultado<T>`: un error de regla llega como código y se devuelve como `{ ok: false, error }`; una falla de red o un error inesperado se lanza como excepción.
- **Sin escritura directa a tablas.** Las políticas de seguridad por fila niegan `insert`, `update` y `delete` a los roles `anon` y `authenticated`. Toda escritura pasa por funciones `security definer` con `search_path` fijo, que validan las reglas y escriben el evento de bitácora en la misma transacción.
- **Lectura por vistas.** Las lecturas usan vistas con seguridad por fila. Las vistas para vecinos nunca exponen teléfonos y muestran los folios de otras casas enmascarados. Las de coordinador validan el rol dentro de la función.
- **Sesión implícita.** El celular abre una sesión anónima de Supabase Auth; cada función resuelve la casa a partir de `auth.uid()`. Ningún método recibe "quién soy".
- **Reloj del servidor.** Las funciones usan `now()` en la base; el reloj nunca viaja como parámetro.
- **Sin funciones de demo.** `ApiDemo` no existe en este adaptador.
- **Llaves.** Solo la llave pública (anon) y la URL del proyecto, como variables de build. La llave `service_role` nunca va en el frontend ni en el repositorio.

Las migraciones SQL, funciones y políticas vivirán en `supabase/`, en la raíz del repositorio.
