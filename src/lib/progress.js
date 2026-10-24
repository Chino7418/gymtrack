// Insignia de la tarjeta Peso del Inicio: compara el último registro con el anterior.
// kind: 'goal' (llegó al objetivo) · 'award' (se acercó al objetivo) · 'away' (se alejó)
//       'down' / 'up' (sin objetivo) · 'same' (sin cambios) · null (falta un registro)
const fmt = (n) => `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(1)} kg`

export function weightTrend(cur, prev, goal) {
  if (cur == null || prev == null) return null
  const change = cur - prev
  if (goal != null && Math.abs(cur - goal) < 0.05) {
    return { kind: 'goal', text: '¡Objetivo!', label: `Llegaste a tu objetivo de ${goal} kg` }
  }
  if (Math.abs(change) < 0.05) return { kind: 'same', text: 'sin cambios', label: 'Sin cambios desde el registro anterior' }
  const verbo = change < 0 ? `Bajaste ${Math.abs(change).toFixed(1)} kg` : `Subiste ${change.toFixed(1)} kg`
  if (goal == null) return { kind: change < 0 ? 'down' : 'up', text: fmt(change), label: `${verbo} desde el registro anterior` }
  const closer = Math.abs(cur - goal) < Math.abs(prev - goal)
  return closer
    ? { kind: 'award', text: fmt(change), label: `${verbo}: estás más cerca de tu objetivo` }
    : { kind: 'away', text: fmt(change), label: `${verbo}: te alejaste un poco de tu objetivo` }
}
