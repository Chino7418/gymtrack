-- Id público de Cloudinary de la foto del ejercicio, para poder borrarla
-- cuando se reemplaza o se borra el ejercicio (lo usa /api/delete-image).
BEGIN;

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS image_public_id TEXT;

NOTIFY pgrst, 'reload schema';
COMMIT;
