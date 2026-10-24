-- Una asistencia por usuario y día.
-- save_workout insertaba con ON CONFLICT DO NOTHING pero no había restricción única,
-- así que cada edición de un entrenamiento agregaba otra fila para el mismo día.
BEGIN;

-- 1. Borrar duplicados. La tabla no tiene created_at y el id es UUID v4, así que no hay
--    "más antigua": se conserva la fila más completa (con workout_id, hora o notas).
DELETE FROM public.gym_attendances g
USING (
  SELECT ctid AS rid, row_number() OVER (
    PARTITION BY user_id, attendance_date
    ORDER BY (workout_id IS NULL), (check_in_time IS NULL), (notes IS NULL), ctid
  ) AS rn
  FROM public.gym_attendances
) d
WHERE g.ctid = d.rid AND d.rn > 1;

-- 2. Restricción única: a partir de acá el ON CONFLICT DO NOTHING de save_workout funciona
ALTER TABLE public.gym_attendances
  ADD CONSTRAINT gym_attendances_user_date_key UNIQUE (user_id, attendance_date);

COMMIT;
