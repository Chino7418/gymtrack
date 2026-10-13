-- GymTrack initial schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  birth_date DATE,
  height_cm NUMERIC(5,2) CHECK (height_cm > 0 AND height_cm < 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- exercises
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  muscle_group VARCHAR(30) NOT NULL CHECK (muscle_group IN ('Pecho','Espalda','Hombros','Biceps','Triceps','Piernas','Gluteos','Abdomen','Otro')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  name VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- workout_exercises
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  position INT NOT NULL CHECK (position >= 1),
  notes TEXT
);

-- workout_sets
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL CHECK (set_number >= 1),
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 0),
  reps INT NOT NULL CHECK (reps >= 1),
  notes TEXT
);

-- gym_attendances
CREATE TABLE gym_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  notes TEXT,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL
);

-- body_weight_entries
CREATE TABLE body_weight_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indices
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_exercises_user ON exercises(user_id);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);
CREATE INDEX idx_workout_sets_we ON workout_sets(workout_exercise_id);
CREATE INDEX idx_attendances_user_date ON gym_attendances(user_id, attendance_date DESC);
CREATE INDEX idx_weight_user_date ON body_weight_entries(user_id, recorded_date DESC);
