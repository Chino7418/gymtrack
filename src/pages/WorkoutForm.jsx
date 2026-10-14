import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { ErrorMsg } from '../components/Layout'

const emptySet = () => ({ weight_kg: '', reps: '', notes: '' })

export default function WorkoutForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [catalog, setCatalog] = useState([])
  const [name, setName] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [notes, setNotes] = useState('')
  const [attend, setAttend] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const ex = await supabase.from(T.exercises).select('*').order(C.exerciseName)
      if (ex.error) setError(ex.error.message); else setCatalog(ex.data)
      if (id) {
        const { data, error } = await supabase.from(T.workouts)
          .select(`*, ${T.workoutExercises}(*, ${T.workoutSets}(*))`).eq('id', id).single()
        if (error) setError(error.message)
        else {
          setName(data.name); setDate(data.workout_date); setNotes(data.notes ?? '')
          setItems([...data[T.workoutExercises]].sort((a, b) => a.position - b.position).map((we) => ({
            exercise_id: we.exercise_id, notes: we.notes ?? '',
            sets: [...we[T.workoutSets]].sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({ weight_kg: s.weight_kg ?? '', reps: s.reps ?? '', notes: s.notes ?? '' })),
          })))
        }
      }
      setLoading(false)
    })()
  }, [id])

  const upd = (i, patch) => setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  const updSet = (i, j, patch) => upd(i, { sets: items[i].sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) })

  const save = async (e) => {
    e.preventDefault(); setError('')
    if (!name.trim()) return setError('Poné un nombre al entrenamiento')
    if (items.length === 0) return setError('Agregá al menos un ejercicio')
    for (const [i, it] of items.entries()) {
      if (!it.exercise_id) return setError(`Elegí el ejercicio #${i + 1}`)
      for (const s of it.sets) {
        if (s.reps === '' || Number(s.reps) < 0 || (s.weight_kg !== '' && Number(s.weight_kg) < 0))
          return setError(`Revisá las series del ejercicio #${i + 1}: repeticiones obligatorias y sin números negativos`)
      }
    }
    const p_exercises = items.map((it, i) => ({
      exercise_id: it.exercise_id, position: i + 1, notes: it.notes || null,
      sets: it.sets.map((s, j) => ({
        set_number: j + 1, weight_kg: s.weight_kg === '' ? null : Number(s.weight_kg),
        reps: Number(s.reps), notes: s.notes || null,
      })),
    }))
    setSaving(true)
    const { error } = await supabase.rpc('save_workout', {
      p_workout_date: date, p_name: name.trim(), p_notes: notes || null,
      p_exercises, p_workout_id: id ?? null, p_attendance: { record: attend },
    })
    setSaving(false)
    if (error) return setError(error.message)
    nav('/')
  }

  if (loading) return <p>Cargando…</p>
  return (
    <form onSubmit={save}>
      <h1 className="h4 mb-3">{id ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}</h1>
      <ErrorMsg error={error} />
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6"><label className="form-label">Nombre</label><input className="form-control" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="col-12 col-md-6"><label className="form-label">Fecha</label><input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="col-12"><label className="form-label">Notas</label><textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="col-12 form-check ms-2"><input id="att" type="checkbox" className="form-check-input" checked={attend} onChange={(e) => setAttend(e.target.checked)} /><label htmlFor="att" className="form-check-label">Registrar asistencia ese día</label></div>
      </div>

      {catalog.length === 0 && <div className="alert alert-warning py-2">Primero cargá ejercicios en la sección Ejercicios.</div>}

      {items.map((it, i) => (
        <div className="card mb-3" key={i}>
          <div className="card-body">
            <div className="d-flex gap-2 mb-2">
              <select className="form-select" value={it.exercise_id} onChange={(e) => upd(i, { exercise_id: e.target.value })}>
                <option value="">Elegir ejercicio…</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c[C.exerciseName]}</option>)}
              </select>
              <button type="button" className="btn btn-outline-danger" onClick={() => setItems(items.filter((_, k) => k !== i))}>Quitar</button>
            </div>
            {it.sets.map((s, j) => (
              <div className="row g-2 mb-2 align-items-center" key={j}>
                <div className="col-2 col-md-1 text-muted">#{j + 1}</div>
                <div className="col-5 col-md-3"><input type="number" min="0" step="0.5" className="form-control" placeholder="Peso (kg)" value={s.weight_kg} onChange={(e) => updSet(i, j, { weight_kg: e.target.value })} /></div>
                <div className="col-5 col-md-3"><input type="number" min="0" className="form-control" placeholder="Reps" value={s.reps} onChange={(e) => updSet(i, j, { reps: e.target.value })} /></div>
                <div className="col-9 col-md-4"><input className="form-control" placeholder="Nota" value={s.notes} onChange={(e) => updSet(i, j, { notes: e.target.value })} /></div>
                <div className="col-3 col-md-1"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => upd(i, { sets: it.sets.filter((_, k) => k !== j) })}>×</button></div>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => upd(i, { sets: [...it.sets, emptySet()] })}>Agregar serie</button>
          </div>
        </div>
      ))}

      <div className="d-flex gap-2 flex-wrap">
        <button type="button" className="btn btn-outline-primary" onClick={() => setItems([...items, { exercise_id: '', notes: '', sets: [emptySet()] }])}>Agregar ejercicio</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar entrenamiento'}</button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => nav('/')}>Cancelar</button>
      </div>
    </form>
  )
}
