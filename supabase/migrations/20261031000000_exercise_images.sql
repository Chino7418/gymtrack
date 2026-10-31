-- Imagen de los ejercicios: columna en exercises + bucket público en Storage.
-- Cada usuario sube solo dentro de su carpeta: exercise-images/<auth.uid()>/<archivo>.
BEGIN;

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Bucket público de lectura (las imágenes se muestran con su URL pública), máx. 2 MB, solo imágenes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exercise-images', 'exercise-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Escritura solo en la carpeta propia
CREATE POLICY "exercise_images_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "exercise_images_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'exercise-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "exercise_images_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-images' AND (storage.foldername(name))[1] = auth.uid()::text);

NOTIFY pgrst, 'reload schema';
COMMIT;
