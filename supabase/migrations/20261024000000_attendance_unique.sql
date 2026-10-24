-- Una asistencia por usuario y día.
-- save_workout insertaba con ON CONFLICT DO NOTHING pero no había restricción única,
-- así que cada edición de un entrenamiento agregaba otra fila para el mismo día.

-- 1. Borrar duplicados, conservando la fila más antigua de cada (usuario, fecha)
DELETE FROM public.gym_attendances a
USING public.gym_attendances b
WHERE a.user_id = b.user_id
  AND a.attendance_date = b.attendance_date
  AND a.ctid > b.ctid;

-- 2. Restricción única: a partir de acá el ON CONFLICT DO NOTHING de save_workout funciona
ALTER TABLE public.gym_attendances
  ADD CONSTRAINT gym_attendances_user_date_key UNIQUE (user_id, attendance_date);
