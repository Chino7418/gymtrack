# Una Más

Aplicación web para registrar entrenamientos, ejercicios, asistencia y peso corporal. Desarrollada con React + Vite + Bootstrap 5 + Supabase + PostgreSQL.

El catálogo de ejercicios sale de la API pública de [wger.de](https://wger.de) (no necesita key). La interfaz tiene tema claro y oscuro (automático según el sistema, o a elección en Perfil).

## 1. Instalación

```bash
npm install
```

## 2. Configuración Supabase

1. Crear proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. Ir a Settings > API y copiar Project URL y anon/public key.
3. Copiar `.env.example` a `.env` y completar:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY

### Fotos en Cloudinary (opcional)

Por defecto las fotos de ejercicios van al bucket `exercise-images` de Supabase Storage. Para usar Cloudinary:

1. Crear una cuenta en [cloudinary.com](https://cloudinary.com) y copiar el **cloud name** del dashboard.
2. En Settings > Upload > Upload presets, crear uno con **Signing mode: Unsigned** (opcional: limitar formatos `jpg,png,webp` y tamaño máximo; no fijes carpeta, la app manda `unamas/<user_id>`).
3. Completar en `.env` (y en Vercel) `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. Listo: las fotos nuevas se suben a `unamas/<user_id>/` y se sirven optimizadas (`f_auto,q_auto`). Las que ya estaban en Supabase siguen funcionando.

El preset unsigned viaja en el frontend (es público por diseño). Cloudinary no permite borrar desde el navegador sin firma: las fotos reemplazadas o de ejercicios borrados quedan en la cuenta y se limpian desde el dashboard.

## 3. Migraciones

Ejecutá las migraciones SQL en Supabase SQL Editor (o CLI):
- `supabase/migrations/20261013184700_init_schema.sql`
- `supabase/migrations/20261013184800_rls_policies.sql`
- `supabase/migrations/20261013184900_profile_trigger.sql`
- `supabase/migrations/20261013185000_rpc_save_workout.sql`
- `supabase/migrations/20261020000000_goal_weight.sql`
- `supabase/migrations/20261024000000_attendance_unique.sql`
- `supabase/migrations/20261031000000_exercise_images.sql` (crea también el bucket `exercise-images` de Storage)

Aplicalas en ese orden.

## 4. Autenticación

En Auth > URL Configuration configurar Site URL: `http://localhost:5173` y Redirect URLs: `http://localhost:5173/reset-password` (agregar dominio Vercel al publicar).

## 5. Desarrollo local

```bash
npm run dev
```

Se abre en `http://localhost:5173`.

## Tests

Usan [Vitest](https://vitest.dev) con entorno jsdom. Cada test está al lado de su archivo (`*.test.js(x)`).

```bash
npm test                                  # todos, una sola corrida
npx vitest run src/lib/sets.test.js       # un solo archivo
npx vitest run -t "pirámide"              # solo los tests cuyo nombre coincide
```

## 6. Despliegue en Vercel

1. Subir repo a GitHub/GitLab.
2. Conectar repo en Vercel.
3. Agregar variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
4. Build: `npm run build`. Output: `dist`.
5. Configurar auth redirect a dominio Vercel.

## 7. PWA (instalar en el celular)

La app se puede instalar como aplicación: en Android/Chrome aparece "Instalar app" en el menú y en iPhone/Safari "Agregar a pantalla de inicio".

- `public/manifest.webmanifest`: nombre, colores, íconos 192/512 y atajos a "Nuevo entrenamiento" y "Asistencia".
- `public/sw.js`: precachea el shell, responde la navegación con red primero (y el shell cacheado si no hay conexión) y los assets con stale-while-revalidate. No toca Supabase, Google Fonts ni wger.
- El service worker se registra solo en producción (`src/main.jsx`), así que en `npm run dev` no hay caché.
- Si cambiás la estrategia del service worker, subí la constante `CACHE` en `sw.js` para invalidar la caché vieja.

## Seguridad

- RLS activado en todas las tablas. Cada usuario solo accede a sus propios datos.
- Usa `auth.uid()` en políticas. No incluir `service_role` en frontend.
- Validaciones también en DB (CHECKs).
- Eliminar con confirmación; ejercicios con historial se desactivan (no se borran físicamente).
