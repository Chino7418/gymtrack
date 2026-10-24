// Carga rápida de series: "4 × 10 · de 30 a 45 kg" ⇄ series individuales.
// En la base siempre se guardan las series una por una (el historial y el progreso salen de ahí).

export const MAX_SERIES = 20

const round = (n) => Math.round(n * 2) / 2 // a 0,5 kg
const num = (v) => (v === '' || v == null ? NaN : Number(v))

// { series, reps, min, max } → [{ weight_kg, reps, notes }]. Sin máximo: todas con el mínimo.
// Con máximo, el peso sube parejo de la primera a la última serie (pirámide, redondeo a 0,5 kg).
// Sin pirámide se respeta el peso tal cual (por ejemplo 21,25 kg con discos de 1,25).
export function buildSets({ series, reps, min, max }) {
  const n = num(series), r = num(reps), lo = num(min)
  const hi = Number.isNaN(num(max)) ? lo : num(max)
  return Array.from({ length: n }, (_, i) => ({
    weight_kg: n === 1 || hi === lo ? lo : round(lo + ((hi - lo) * i) / (n - 1)),
    reps: r,
    notes: '',
  }))
}

// Mensaje de error, o '' si la carga rápida es válida
export function quickError({ series, reps, min, max }) {
  const n = num(series), r = num(reps), lo = num(min), hi = num(max)
  if (!Number.isInteger(n) || n < 1 || n > MAX_SERIES) return `las series tienen que ser un número entre 1 y ${MAX_SERIES}`
  if (!Number.isInteger(r) || r < 1) return 'las repeticiones tienen que ser un número entero desde 1'
  if (Number.isNaN(lo) || lo < 0) return 'falta el peso (0 si es sin peso)'
  if (!Number.isNaN(hi) && hi < lo) return 'el peso máximo no puede ser menor que el mínimo'
  return ''
}

// Series → carga rápida, o null si no se pueden expresar así
// (repeticiones distintas, notas por serie o pesos que no siguen la pirámide).
export function summarize(sets) {
  if (!sets?.length || sets.some((s) => s.reps === '' || s.weight_kg === '')) return null
  const reps = Number(sets[0].reps)
  if (sets.some((s) => Number(s.reps) !== reps || s.notes)) return null
  const lo = Number(sets[0].weight_kg), hi = Number(sets.at(-1).weight_kg)
  const q = { series: String(sets.length), reps: String(reps), min: String(lo), max: hi === lo ? '' : String(hi) }
  const rebuilt = buildSets(q)
  return rebuilt.every((s, i) => Math.abs(s.weight_kg - Number(sets[i].weight_kg)) < 0.01) ? q : null
}

// Texto corto: "4×10 · 30→45 kg", o la lista "40×10 · 45×8" si no hay resumen
export function describe(sets) {
  const q = summarize(sets)
  if (!q) return sets.map((s) => `${Number(s.weight_kg)}×${s.reps}`).join(' · ')
  return `${q.series}×${q.reps} · ${q.max ? `${q.min}→${q.max}` : q.min} kg`
}
