import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { buildSets, quickError, quickIssue, summarize, describe } from '../lib/sets'
import { ErrorMsg } from '../components/Layout'
import ExercisePicker, { norm } from '../components/ExercisePicker'
import { useAuth } from '../context/AuthContext'

const emptySet = () => ({ weight_kg: '', reps: '', notes: '' })
const emptyQuick = () => ({ series: '', reps: '', min: '', max: '' })

// Un ejercicio se carga en modo rápido (series × reps · peso mín–máx) si sus series lo permiten;
// si no (reps distintas, notas por serie), en modo detallado.
const toItem = (exercise_id, sets, extra = {}) => {
  const quick = summarize(sets)
  return quick
    ? { exercise_id, notes: '', mode: 'quick', quick, sets: [], ...extra }
    : { exercise_id, notes: '', mode: 'detail', quick: emptyQuick(), sets, ...extra }
}

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
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    (async () => {
      const ex = await supabase.from(T.exercises).select('*').order(C.exerciseName)
      if (ex.error) setError(ex.error.message); else setCatalog(ex.data)
      if (id) {
        const { data, error } = await supabase.from(T.workouts)
          .select(`*, ${T.workoutExercises}(*, ${T.workoutSets}(*))`).eq('id', id).maybeSingle()
        // Un id con formato inválido devuelve 22P02: también es "no encontrado"
        if (error && error.code !== '22P02') setError(error.message)
        else if (!data) setNotFound(true)
        else {
          setName(data.name); setDate(data.workout_date); setNotes(data.notes ?? '')
          setItems([...data[T.workoutExercises]].sort((a, b) => a.position - b.position).map((we) => {
            const sets = [...we[T.workoutSets]].sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({ weight_kg: s.weight_kg ?? '', reps: s.reps ?? '', notes: s.notes ?? '' }))
            return toItem(we.exercise_id, sets, { notes: we.notes ?? '', showExNote: !!we.notes })
          }))
        }
      }
      setLoading(false)
    })()
  }, [id])

  const upd = (i, patch) => setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  const updQuick = (i, patch) => upd(i, { quick: { ...items[i].quick, ...patch } })
  const updSet = (i, j, patch) => upd(i, { sets: items[i].sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) })
  // Nueva serie = copia de la anterior (peso y reps), para cargar más rápido
  const addSet = (i) => {
    const last = items[i].sets.at(-1)
    upd(i, { sets: [...items[i].sets, last ? { ...last, notes: '', showNote: false } : emptySet()] })
  }
  // Rápido → detallado: genera las series para poder corregir una por una
  const toDetail = (i) => {
    const { quick: q } = items[i]
    // Si la carga rápida está incompleta, se precarga lo que haya (peso mínimo y reps en cada serie)
    const n = Math.min(Math.max(parseInt(q.series, 10) || 1, 1), 20)
    const sets = quickError(q) ? Array.from({ length: n }, () => ({ weight_kg: q.min, reps: q.reps, notes: '' })) : buildSets(q)
    upd(i, { mode: 'detail', sets })
  }
  const toQuick = (i) => upd(i, { mode: 'quick', quick: summarize(items[i].sets) })

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
    if (!ex) return false
    const prev = await lastSets(ex.id)
    // Se precarga lo de la última vez; si es la primera, carga rápida vacía
    setItems((list) => [...list, prev?.sets.length ? toItem(ex.id, prev.sets, { prev }) : { ...toItem(ex.id, []), mode: 'quick', quick: emptyQuick() }])
  }
  const exName = (exId) => catalog.find((c) => c.id === exId)?.[C.exerciseName] ?? 'Ejercicio'

  const save = async (e) => {
    e.preventDefault(); setError('')
    if (!name.trim()) return setError('Poné un nombre al entrenamiento')
    if (!date) return setError('Elegí la fecha del entrenamiento')
    if (items.length === 0) return setError('Agregá al menos un ejercicio')
    for (const [i, it] of items.entries()) {
      if (!it.exercise_id) return setError(`Elegí el ejercicio #${i + 1}`)
      if (it.mode === 'quick') {
        const msg = quickError(it.quick)
        if (msg) return setError(`${exName(it.exercise_id)}: ${msg}`)
      } else {
        if (it.sets.length === 0) return setError(`${exName(it.exercise_id)}: agregá al menos una serie`)
        for (const s of it.sets) {
          if (s.reps === '' || !Number.isInteger(Number(s.reps)) || Number(s.reps) < 1 || s.weight_kg === '' || Number(s.weight_kg) < 0)
            return setError(`Revisá las series de ${exName(it.exercise_id)}: peso y repeticiones son obligatorios (repeticiones enteras desde 1, peso sin negativos)`)
        }
      }
    }
    const p_exercises = items.map((it, i) => ({
      exercise_id: it.exercise_id, position: i + 1, notes: it.notes || null,
      sets: (it.mode === 'quick' ? buildSets(it.quick) : it.sets).map((s, j) => ({
        set_number: j + 1, weight_kg: Number(s.weight_kg),
        reps: Number(s.reps), notes: s.notes || null,
      })),
    }))
    setSaving(true)
    // La función save_workout inserta la asistencia sin chequear duplicados: solo se pide si ese día no tiene
    let record = attend
    if (record) {
      const { count, error: attErr } = await supabase.from(T.attendances).select('id', { count: 'exact', head: true }).eq(C.attendanceDate, date)
      if (attErr) { setSaving(false); return setError(attErr.message) }
      record = !count
    }
    const { error } = await supabase.rpc('save_workout', {
      p_workout_date: date, p_name: name.trim(), p_notes: notes || null,
      p_exercises, p_workout_id: id ?? null, p_attendance: { record },
    })
    setSaving(false)
    if (error) return setError(error.message)
    nav('/workouts')
  }

  if (loading) return <p role="status">Cargando…</p>
  if (notFound) return (
    <>
      <h1 className="h4 mb-3">Entrenamiento no encontrado</h1>
      <ErrorMsg error={error} />
      <p className="text-muted">Puede que se haya borrado o que el enlace esté mal.</p>
      <button type="button" className="btn btn-primary" onClick={() => nav('/workouts')}>Ver mis entrenamientos</button>
    </>
  )
  return (
    <form onSubmit={save} noValidate>
      <h1 className="h4 mb-3">{id ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}</h1>
      <ErrorMsg error={error} />
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6"><label className="form-label" htmlFor="wf-name">Nombre</label><input id="wf-name" className="form-control" placeholder="Ej.: Pecho y tríceps" aria-invalid={error.startsWith('Poné un nombre') || undefined} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="col-12 col-md-6"><label className="form-label" htmlFor="wf-date">Fecha</label><input id="wf-date" type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="col-12"><label className="form-label" htmlFor="wf-notes">Notas</label><textarea id="wf-notes" className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="col-12 form-check ms-2"><input id="att" type="checkbox" className="form-check-input" checked={attend} onChange={(e) => setAttend(e.target.checked)} /><label htmlFor="att" className="form-check-label">Registrar asistencia ese día</label></div>
      </div>

      {items.map((it, i) => {
        const exLabel = exName(it.exercise_id)
        // Error en vivo solo para un valor cargado que es inválido; un campo todavía vacío no es error
        const found = it.mode === 'quick' ? quickIssue(it.quick) : null
        const issue = found && it.quick[found.field] !== '' ? found : null
        const preview = it.mode === 'quick' && !quickError(it.quick) ? buildSets(it.quick) : null
        const inv = (f) => (issue?.field === f ? true : undefined)
        return (
          <section className="card mb-3" key={i} aria-labelledby={`ex-${i}`}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div className="min-w-0">
                  <h2 id={`ex-${i}`} className="h6 fw-bold mb-0 text-truncate">{i + 1}. {exLabel}</h2>
                  {it.prev && <small className="text-muted">Última vez ({dayjs(it.prev.date).format('DD/MM')}): {describe(it.prev.sets)}</small>}
                </div>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={`Quitar ${exLabel}`}>Quitar</button>
              </div>

              {it.mode === 'quick' ? (
                <>
                  <div className="quick-row" role="group" aria-label={`Carga rápida de ${exLabel}`}>
                    <label className="quick-field"><span>Series</span>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" max="20" className="form-control" placeholder="4" aria-invalid={inv('series')} aria-describedby={`qhint-${i}`} value={it.quick.series} onChange={(e) => updQuick(i, { series: e.target.value })} /></label>
                    <span className="quick-sep" aria-hidden="true">×</span>
                    <label className="quick-field"><span>Reps</span>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" className="form-control" placeholder="10" aria-invalid={inv('reps')} aria-describedby={`qhint-${i}`} value={it.quick.reps} onChange={(e) => updQuick(i, { reps: e.target.value })} /></label>
                    <span className="quick-sep" aria-hidden="true">·</span>
                    <label className="quick-field"><span>Kg mín.</span>
                      <input type="number" inputMode="decimal" min="0" step="any" className="form-control" placeholder="30" aria-invalid={inv('min')} aria-describedby={`qhint-${i}`} value={it.quick.min} onChange={(e) => updQuick(i, { min: e.target.value })} /></label>
                    <span className="quick-sep" aria-hidden="true">–</span>
                    <label className="quick-field"><span>Kg máx.</span>
                      <input type="number" inputMode="decimal" min="0" step="any" className="form-control" placeholder="—" aria-invalid={inv('max')} aria-describedby={`qhint-${i}`} value={it.quick.max} onChange={(e) => updQuick(i, { max: e.target.value })} /></label>
                  </div>
                  <p id={`qhint-${i}`} className={`quick-preview small mb-2 ${issue ? 'text-danger-emphasis' : 'text-muted'}`} aria-live="polite">
                    {preview ? `Series: ${preview.map((s) => s.weight_kg).join(' · ')} kg × ${it.quick.reps}`
                      : issue ? issue.message[0].toUpperCase() + issue.message.slice(1)
                      : 'Completá series, repeticiones y peso. El máximo es opcional: si lo ponés, el peso sube parejo serie a serie.'}
                  </p>
                </>
              ) : (
                <>
                  {it.sets.length > 0 && (
                    <div className="set-row set-head" aria-hidden="true"><span>Serie</span><span>Kg</span><span>Reps</span></div>
                  )}
                  {it.sets.map((s, j) => (
                    <div key={j} className="mb-2">
                      <div className="set-row">
                        <span className="set-num">{j + 1}</span>
                        <input type="number" inputMode="decimal" min="0" step="any" className="form-control" aria-label={`Peso serie ${j + 1} (kg)`} value={s.weight_kg} onChange={(e) => updSet(i, j, { weight_kg: e.target.value })} />
                        <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" className="form-control" aria-label={`Repeticiones serie ${j + 1}`} value={s.reps} onChange={(e) => updSet(i, j, { reps: e.target.value })} />
                        <button type="button" className={`btn btn-outline-secondary ${s.notes || s.showNote ? 'active' : ''}`} aria-pressed={!!(s.notes || s.showNote)} aria-label={`Nota serie ${j + 1}`} onClick={() => updSet(i, j, { showNote: !s.showNote })}>✎</button>
                        <button type="button" className="btn btn-outline-secondary" aria-label={`Quitar serie ${j + 1}`} onClick={() => upd(i, { sets: it.sets.filter((_, k) => k !== j) })}>×</button>
                      </div>
                    </div>
                  ))}
                  {/* Notas abajo de todas las series, para no cortar la lista */}
                  {it.sets.some((s) => s.notes || s.showNote) && (
                    <div className="set-notes mb-2">
                      {it.sets.map((s, j) => (s.notes || s.showNote) && (
                        <div key={j} className="set-note">
                          <label className="set-note-label" htmlFor={`note-${i}-${j}`}>Serie {j + 1}</label>
                          <input id={`note-${i}-${j}`} className="form-control" placeholder="Ej.: con pausa, al fallo" value={s.notes} onChange={(e) => updSet(i, j, { notes: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {it.showExNote && (
                <div className="mb-2">
                  <label className="form-label small text-muted mb-1" htmlFor={`exnote-${i}`}>Nota del ejercicio</label>
                  <input id={`exnote-${i}`} className="form-control" placeholder="Ej.: agarre cerrado, banco a 30°" value={it.notes} onChange={(e) => upd(i, { notes: e.target.value })} />
                </div>
              )}

              <div className="d-flex flex-wrap gap-2">
                {it.mode === 'quick'
                  ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toDetail(i)}>Detallar series</button>
                  : <>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => addSet(i)}>Agregar serie</button>
                      {summarize(it.sets) && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toQuick(i)}>Carga rápida</button>}
                    </>}
                {!it.showExNote && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => upd(i, { showExNote: true })}>Agregar nota</button>}
              </div>
            </div>
          </section>
        )
      })}

      {picking && <ExercisePicker mine={catalog} onPick={addExercise} includeMine />}

      <div className="d-flex gap-2 flex-wrap">
        <button type="button" className={`btn ${picking ? 'btn-outline-secondary' : 'btn-outline-primary'}`} aria-expanded={picking} onClick={() => setPicking(!picking)}>{picking ? 'Cerrar buscador' : 'Agregar ejercicio'}</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar entrenamiento'}</button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => nav('/workouts')}>Cancelar</button>
      </div>
    </form>
  )
}
