import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { ErrorMsg } from '../components/Layout'
import ExercisePicker, { norm } from '../components/ExercisePicker'
import { useAuth } from '../context/AuthContext'

const emptySet = () => ({ weight_kg: '', reps: '', notes: '' })

export default function WorkoutForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [name, setName] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [notes, setNotes] = useState('')
  const [attend, setAttend] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(!id)

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
  // Nueva serie = copia de la anterior (peso y reps), para cargar más rápido
  const addSet = (i) => {
    const last = items[i].sets.at(-1)
    upd(i, { sets: [...items[i].sets, last ? { ...last, notes: '' } : emptySet()] })
  }

  // Del catálogo wger: si no está en mis ejercicios, lo crea
  const ensureExercise = async (x) => {
    if (catalog.some((c) => c.id === x.id)) return x
    const found = catalog.find((c) => norm(c.name) === norm(x.name))
    if (found) return found
    const { data, error } = await supabase.from(T.exercises)
      .insert({ name: x.name, muscle_group: x.muscle_group, description: x.description, user_id: user.id })
      .select().single()
    if (error) { setError(error.message); return null }
    setCatalog((c) => [...c, data])
    return data
  }

  // Series de la última vez que se hizo el ejercicio (fuera de este entrenamiento)
  const lastSets = async (exerciseId) => {
    let q = supabase.from(T.workouts)
      .select(`workout_date, ${T.workoutExercises}!inner(exercise_id, ${T.workoutSets}(*))`)
      .eq(`${T.workoutExercises}.exercise_id`, exerciseId)
      .order('workout_date', { ascending: false }).limit(1)
    if (id) q = q.neq('id', id)
    const { data } = await q
    const we = data?.[0]?.[T.workoutExercises]?.[0]
    if (!we) return null
    return {
      date: data[0].workout_date,
      sets: [...we[T.workoutSets]].sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ weight_kg: s.weight_kg, reps: s.reps, notes: '' })),
    }
  }

  const addExercise = async (x) => {
    setError('')
    const ex = await ensureExercise(x)
    if (!ex) return
    const prev = await lastSets(ex.id)
    setItems((list) => [...list, { exercise_id: ex.id, notes: '', sets: prev?.sets.length ? prev.sets : [emptySet()], prev }])
    setPicking(false)
  }
  const exName = (exId) => catalog.find((c) => c.id === exId)?.[C.exerciseName] ?? 'Ejercicio'
  const resumen = (sets) => sets.map((s) => `${Number(s.weight_kg)}×${s.reps}`).join(' · ')

  const save = async (e) => {
    e.preventDefault(); setError('')
    if (!name.trim()) return setError('Poné un nombre al entrenamiento')
    if (items.length === 0) return setError('Agregá al menos un ejercicio')
    for (const [i, it] of items.entries()) {
      if (!it.exercise_id) return setError(`Elegí el ejercicio #${i + 1}`)
      for (const s of it.sets) {
        if (s.reps === '' || Number(s.reps) < 1 || s.weight_kg === '' || Number(s.weight_kg) < 0)
          return setError(`Revisá las series del ejercicio #${i + 1}: peso y repeticiones son obligatorios (mínimo 1 repetición, sin negativos)`)
      }
    }
    const p_exercises = items.map((it, i) => ({
      exercise_id: it.exercise_id, position: i + 1, notes: it.notes || null,
      sets: it.sets.map((s, j) => ({
        set_number: j + 1, weight_kg: Number(s.weight_kg),
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
    nav('/workouts')
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

      {items.map((it, i) => (
        <div className="card mb-3" key={i}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div className="min-w-0">
                <strong className="d-block text-truncate">{i + 1}. {exName(it.exercise_id)}</strong>
                {it.prev && <small className="text-muted">Última vez ({dayjs(it.prev.date).format('DD/MM')}): {resumen(it.prev.sets)}</small>}
              </div>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setItems(items.filter((_, k) => k !== i))}>Quitar</button>
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
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => addSet(i)}>Agregar serie</button>
          </div>
        </div>
      ))}

      {picking && <ExercisePicker mine={catalog} onPick={addExercise} includeMine />}

      <div className="d-flex gap-2 flex-wrap">
        <button type="button" className={`btn ${picking ? 'btn-outline-secondary' : 'btn-outline-primary'}`} onClick={() => setPicking(!picking)}>{picking ? 'Cerrar buscador' : 'Agregar ejercicio'}</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar entrenamiento'}</button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => nav('/workouts')}>Cancelar</button>
      </div>
    </form>
  )
}
