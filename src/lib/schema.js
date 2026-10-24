// Nombres de tablas y columnas. Si alguno no coincide con tus migraciones, cambialo SOLO acá.
// Confirmados por la función save_workout: workouts, workout_exercises, workout_sets, gym_attendances.
// Supuestos (verificar contra init_schema.sql): profiles, exercises, body_weights y sus columnas.
export const T = {
  profiles: 'profiles',
  exercises: 'exercises',
  workouts: 'workouts',
  workoutExercises: 'workout_exercises',
  workoutSets: 'workout_sets',
  attendances: 'gym_attendances',
  weights: 'body_weight_entries',
}
export const C = {
  profileName: 'full_name',
  exerciseName: 'name',
  exerciseGroup: 'muscle_group',
  weightValue: 'weight_kg',
  weightDate: 'recorded_date',
  attendanceDate: 'attendance_date',
}
