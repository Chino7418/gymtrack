-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weight_entries ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- exercises
CREATE POLICY "Users manage own exercises" ON exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workouts
CREATE POLICY "Users manage own workouts" ON workouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workout_exercises: ensure belongs to user's workout
CREATE POLICY "we_select" ON workout_exercises FOR SELECT USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid())
);
CREATE POLICY "we_insert" ON workout_exercises FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid())
);
CREATE POLICY "we_update" ON workout_exercises FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid())
);
CREATE POLICY "we_delete" ON workout_exercises FOR DELETE USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid())
);

-- workout_sets
CREATE POLICY "ws_select" ON workout_sets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  )
);
CREATE POLICY "ws_insert" ON workout_sets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  )
);
CREATE POLICY "ws_update" ON workout_sets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  )
);
CREATE POLICY "ws_delete" ON workout_sets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  )
);

-- attendances
CREATE POLICY "att_select" ON gym_attendances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "att_insert" ON gym_attendances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "att_update" ON gym_attendances FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "att_delete" ON gym_attendances FOR DELETE USING (auth.uid() = user_id);

-- body weight
CREATE POLICY "bw_select" ON body_weight_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bw_insert" ON body_weight_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bw_update" ON body_weight_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bw_delete" ON body_weight_entries FOR DELETE USING (auth.uid() = user_id);
