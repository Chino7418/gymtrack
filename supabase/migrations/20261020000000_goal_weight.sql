-- Objetivo de peso del usuario (se muestra en el dashboard)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC(6,2)
  CHECK (goal_weight_kg IS NULL OR (goal_weight_kg > 0 AND goal_weight_kg < 500));

NOTIFY pgrst, 'reload schema';
