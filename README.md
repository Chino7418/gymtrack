# Una Más

Aplicación web para registrar entrenamientos, ejercicios, asistencia y peso corporal. Desarrollada con React + Vite + Bootstrap 5 + Supabase + PostgreSQL.

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

## 3. Migraciones

Ejecutar las migraciones SQL en Supabase SQL Editor (o CLI):
- `supabase/migrations/20261013184700_init_schema.sql`
- `supabase/migrations/20261013184800_rls_policies.sql`
- `supabase/migrations/20261013184900_profile_trigger.sql`
- `supabase/migrations/20261013185000_rpc_save_workout.sql`

## 4. Autenticación

En Auth > URL Configuration configurar Site URL: `http://localhost:5173` y Redirect URLs: `http://localhost:5173/reset-password` (agregar dominio Vercel al publicar).

## 5. Desarrollo local

```bash
npm run dev
```

## 6. Despliegue en Vercel

1. Subir repo a GitHub/GitLab.
2. Conectar repo en Vercel.
3. Agregar variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
4. Build: `npm run build`. Output: `dist`.
5. Configurar auth redirect a dominio Vercel.

## Seguridad

- RLS activado en todas las tablas. Cada usuario solo accede a sus propios datos.
- Usa `auth.uid()` en políticas. No incluir `service_role` en frontend.
- Validaciones también en DB (CHECKs).
- Eliminar con confirmación; ejercicios con historial se desactivan (no se borran físicamente).
