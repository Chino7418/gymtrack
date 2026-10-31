# AGENTS.md

App **"Una Más"** (repo `gymtrack`): registro de entrenamientos, ejercicios, asistencia y peso corporal. React 19 + Vite 8 + Bootstrap 5.3 + Supabase; mobile-first. Toda la UI y la documentación están en español rioplatense (voseo). Deploy automático a Vercel al pushear a `main`.

`CLAUDE.md` tiene la arquitectura y convenciones completas. Si cambiás una convención, actualizá los dos archivos.

## Comandos

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Vitest, una sola corrida
npm run build     # salida en dist/
```

- Un archivo: `npx vitest run src/lib/sets.test.js`
- Un test por nombre: `npx vitest run -t "pirámide"`
- No hay lint, typecheck ni formatter. La verificación es `npm test` + `npm run build`.
- Vite 8 exige Node `^20.19.0 || >=22.12.0`.

## Setup y datos

- `.env` (ver `.env.example`) necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Sin ambas, `src/lib/supabaseClient.js` falla al importarse.
- No hay backend propio: el browser habla directo con Supabase y la seguridad la da RLS por `auth.uid()`. No pongas `service_role` en el frontend. Las consultas no necesitan filtrar por `user_id`; RLS ya lo hace.
- No hay Supabase local, seed ni config de CLI. Las migraciones de `supabase/migrations/` se aplican a mano en el SQL Editor, en orden de timestamp. Para un cambio de esquema, creá una migración nueva con timestamp; no edites una ya aplicada.
- Los tests no tocan la base real ni wger: mockeá `supabaseClient` y `fetch`.

## Arquitectura que no se ve en los nombres

- Crear/editar un entrenamiento va por el RPC `save_workout` (transaccional, `SECURITY DEFINER`). `WorkoutForm.jsx` arma el JSONB y debe mandar solo los campos que espera la función (nada de props de UI como `prev` o `showNote`). Al editar, la función borra y recrea `workout_exercises`/`workout_sets`. Borrar un entrenamiento sí es un `delete` directo.
- La carga rápida de `src/lib/sets.js` expande `4 × 10 · 30–45 kg` a series individuales antes del RPC; en la base solo existen series sueltas.
- Repetir un entrenamiento es `/workouts/new?repeat=<id>`: `WorkoutForm.jsx` lo trae, precarga todo con la fecha de hoy y el bloque `prev` (solo UI, no viaja al RPC). El borrador local (`src/lib/workoutDraft.js`, clave `unamas.workoutDraft.<user_id>`) se usa solo en alta y repetición, nunca al editar.
- Temporizador: `src/lib/useRestTimer.js` comparte el estado entre el reloj de Inicio (`RestTimer.jsx`), la barra del formulario (`RestTimerBar.jsx`) y la barra global del `Layout.jsx`, con `localStorage` (`gymtrack.restTimer`). Marcar una serie como hecha arranca el descanso con `restart()`. La barra global aparece en todas las pantallas mientras el descanso corre o está en pausa, salvo en Inicio y el formulario, que ya lo muestran.
- PWA: `public/manifest.webmanifest` + `public/sw.js` (shell precacheado, navegación red-primero y assets stale-while-revalidate, solo mismo origen). El SW se registra en `src/main.jsx` solo en producción; si cambiás la estrategia, subí `CACHE` en `sw.js`.
- Archivar ejercicios usa `exercises.is_active = false` (columna existente). El buscador oculta los archivados (`is_active !== false`), pero el formulario resuelve igual el nombre de los que ya están cargados.
- `src/lib/schema.js` centraliza las tablas (`T`) y la mayoría de columnas (`C`), pero no es completo: los campos de perfil se usan literales (`first_name`, `last_name`, `username`, `birth_date`, `height_cm`, `goal_weight_kg`). `C.profileName` está obsoleto: `full_name` no existe en la base.
- `muscle_group` tiene un CHECK sin tildes: `Pecho`, `Espalda`, `Hombros`, `Biceps`, `Triceps`, `Piernas`, `Gluteos`, `Abdomen`, `Otro`. Para mostrar, usá `grupoLabel` de `src/lib/muscles.js`.
- Catálogo de ejercicios: API pública de wger.de, sin key, con caché en memoria por categoría. Los tests reimportan el módulo para aislar ese caché.
- Fotos: se achican en el browser y se suben al bucket público `exercise-images/<user_id>/`; la URL queda en `exercises.image_url`. `insertExercise` reintenta sin `image_url` si la migración no está aplicada.
- `gym_attendances` necesita la unique `(user_id, attendance_date)` para que funcione el `ON CONFLICT DO NOTHING` de `save_workout`.

## UI y convenciones

- Todo texto visible en español rioplatense. No agregues textos en inglés.
- Sin librería de estado ni de formularios: `useState` + llamadas a Supabase en la página.
- Accesibilidad: `<label htmlFor>` o `aria-label`; errores con `ErrorMsg`, éxitos con `InfoMsg`, borrados con `ConfirmButton` (dos pasos, nunca `confirm()` nativo).
- Tema: tokens CSS bajo `[data-bs-theme]` en `src/styles.css`. No uses colores literales en componentes ni `@media (prefers-color-scheme)` en CSS. `src/lib/theme.js` y el script inline de `index.html` setean el atributo; los gráficos escuchan el evento `themechange`.
- Orden CSS: `styles.css` → `a11y.css` → `motion.css`; `dashboard.css` se importa desde `Dashboard.jsx` y carga después (por eso `a11y.css` usa `:root` para ganar especificidad).
- Mobile: barra inferior `.tabbar` por debajo de `md`, menú superior desde `md`; objetivos táctiles de 44px con `pointer: coarse`.

## Tests

- Vitest + jsdom, configuración en `vite.config.js` (`restoreMocks: true`).
- Cada test va al lado de su archivo (`*.test.js` / `*.test.jsx`) y los nombres van en español.
- No hay setup file ni coverage configurado.

## Referencias

- `README.md`: instalación, migraciones, Auth y deploy.
- `.claude/agents/*` es un flujo de Claude Code; OpenCode no expone esos subagentes (solo `explore`/`general`). Hacé el equivalente a mano.
