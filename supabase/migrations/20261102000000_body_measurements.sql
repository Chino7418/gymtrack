-- Body measurements (brazo, piernas, cadera, cintura, cuello) for the Weight screen
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measured_date DATE NOT NULL,
  measurement VARCHAR(30) NOT NULL CHECK (measurement IN ('brazo', 'piernas', 'cadera', 'cintura', 'cuello')),
  value_cm NUMERIC(6,2) NOT NULL CHECK (value_cm > 0 AND value_cm < 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, measured_date DESC);

-- Body measurements follow the same RLS pattern as body_weight_entries
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bm_select" ON body_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bm_insert" ON body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bm_update" ON body_measurements FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bm_delete" ON body_measurements FOR DELETE USING (auth.uid() = user_id);
