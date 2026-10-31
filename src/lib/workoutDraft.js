// Borrador local del formulario de entrenamiento, separado por usuario.
// Se usa solo para entrenamientos nuevos (o repetidos), no para editar uno existente.
const key = (userId) => `unamas.workoutDraft.${userId}`

export function readWorkoutDraft(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return null
    const draft = JSON.parse(raw)
    return draft && typeof draft === 'object' && Array.isArray(draft.items) ? draft : null
  } catch { return null }
}

export function writeWorkoutDraft(userId, draft) {
  if (!userId) return
  try { localStorage.setItem(key(userId), JSON.stringify(draft)) } catch { /* sin storage */ }
}

export function clearWorkoutDraft(userId) {
  if (!userId) return
  try { localStorage.removeItem(key(userId)) } catch { /* sin storage */ }
}
