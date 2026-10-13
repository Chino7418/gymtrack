-- Save workout transactionally
CREATE OR REPLACE FUNCTION public.save_workout(
  p_workout_id UUID DEFAULT NULL,
  p_workout_date DATE,
  p_name VARCHAR,
  p_notes TEXT,
  p_exercises JSONB,
  p_attendance JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workout_id UUID;
  v_ex JSONB;
  v_we_id UUID;
  v_s JSONB;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_workout_id IS NULL THEN
    INSERT INTO workouts (user_id, workout_date, name, notes)
    VALUES (v_uid, p_workout_date, p_name, p_notes)
    RETURNING id INTO v_workout_id;
  ELSE
    -- ensure ownership
    PERFORM 1 FROM workouts WHERE id = p_workout_id AND user_id = v_uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
    UPDATE workouts SET workout_date = p_workout_date, name = p_name, notes = p_notes, updated_at = now()
    WHERE id = p_workout_id;
    v_workout_id := p_workout_id;
    -- clean existing
    DELETE FROM workout_exercises WHERE workout_id = v_workout_id;
  END IF;

  FOR v_ex IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
    INSERT INTO workout_exercises (workout_id, exercise_id, position, notes)
    VALUES (v_workout_id, (v_ex->>'exercise_id')::UUID, (v_ex->>'position')::INT, v_ex->>'notes')
    RETURNING id INTO v_we_id;
    IF v_ex ? 'sets' THEN
      FOR v_s IN SELECT * FROM jsonb_array_elements(v_ex->'sets') LOOP
        INSERT INTO workout_sets (workout_exercise_id, set_number, weight_kg, reps, notes)
        VALUES (v_we_id, (v_s->>'set_number')::INT, (v_s->>'weight_kg')::NUMERIC, (v_s->>'reps')::INT, v_s->>'notes');
      END IF;
    END IF;
  END LOOP;

  IF p_attendance IS NOT NULL AND (p_attendance->>'record')::BOOLEAN THEN
    INSERT INTO gym_attendances (user_id, attendance_date, workout_id)
    VALUES (v_uid, p_workout_date, v_workout_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('id', v_workout_id);
END;
$$;
