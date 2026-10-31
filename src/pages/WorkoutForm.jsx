import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { buildSets, quickError, quickIssue, summarize, describe, itemSummary } from '../lib/sets'
import useMediaQuery from '../lib/useMediaQuery'
import { ChevronDown, ChevronUp, X, Plus, Check, Pencil } from 'lucide-react'
import { ErrorMsg } from '../components/Layout'
import ExercisePicker, { norm } from '../components/ExercisePicker'
import RestTimerBar from '../components/RestTimerBar'
import { useAuth } from '../context/AuthContext'
import { insertExercise, uploadExerciseImage } from '../lib/images'
import { readWorkoutDraft, writeWorkoutDraft, clearWorkoutDraft } from '../lib/workoutDraft'

const emptySet = () => ({ weight_kg: '', reps: '', notes: '', done: false })
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
  const [params] = useSearchParams()
  const repeatId = params.get('repeat')
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
  const [notFound, setNotFound] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const timerRef = useRef(null)
  // Celular: acordeón. Solo una sección abierta ('info' = datos del entrenamiento, o el índice del ejercicio)
  const mobile = useMediaQuery('(max-width: 767.98px)')
  const [picking, setPicking] = useState(!id && !mobile)
  const justAdded = useRef(false)
  const [open, setOpen] = useState(id ? null : 'info')
  const isOpen = (k) => !mobile || open === k
  const toggle = (k) => setOpen(open === k ? null : k)
  const count = useRef(0)
  count.current = items.length

  useEffect(() => {
    setDraftRestored(false)
    ;(async () => {
      const ex = await supabase.from(T.exercises).select('*').order(C.exerciseName)
      if (ex.error) setError(ex.error.message); else setCatalog(ex.data)
      const sourceId = id ?? repeatId
      if (sourceId) {
        const { data, error } = await supabase.from(T.workouts)
          .select(`*, ${T.workoutExercises}(*, ${T.workoutSets}(*))`).eq('id', sourceId).maybeSingle()
        // Un id con formato inválido devuelve 22P02: también es "no encontrado"
        if (error && error.code !== '22P02') setError(error.message)
        else if (!data) {
          if (id) setNotFound(true)
          else setError('No se pudo cargar el entrenamiento a repetir. Podés empezar uno nuevo.')
        } else {
          const repeat = !id
          const workoutItems = [...data[T.workoutExercises]].sort((a, b) => a.position - b.position).map((we) => {
            const sets = [...we[T.workoutSets]].sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({ weight_kg: s.weight_kg ?? '', reps: s.reps ?? '', notes: s.notes ?? '', done: false }))
            return toItem(we.exercise_id, sets, {
              notes: we.notes ?? '', showExNote: !!we.notes,
              ...(repeat ? { prev: { date: data.workout_date, sets } } : {}),
            })
          })
          setName(data.name ?? '')
          setDate(repeat ? dayjs().format('YYYY-MM-DD') : data.workout_date)
          setNotes(repeat ? '' : data.notes ?? '')
          setItems(workoutItems)
          if (repeat) setAttend(true)
        }
      } else {
        const draft = readWorkoutDraft(user.id)
        if (draft) {
          setName(draft.name ?? '')
          setDate(draft.date ?? dayjs().format('YYYY-MM-DD'))
          setNotes(draft.notes ?? '')
          setAttend(draft.attend !== false)
          setItems(draft.items.map((it) => ({
            ...it,
            quick: it.quick ?? emptyQuick(),
            sets: (it.sets ?? []).map((s) => ({ ...s, done: !!s.done })),
          })))
          setDraftRestored(true)
        }
      }
      setLoading(false)
    })()
  }, [id, repeatId, user.id])

  // Borrador local: se guarda solo para entrenamientos nuevos o repetidos.
  useEffect(() => {
    if (loading || notFound || id) return
    const empty = !name.trim() && !notes.trim() && items.length === 0
    if (empty) clearWorkoutDraft(user.id)
    else writeWorkoutDraft(user.id, { name, date, notes, attend, items })
  }, [loading, notFound, id, name, date, notes, attend, items, user.id])

  const discardDraft = () => {
    clearWorkoutDraft(user.id)
    setName(''); setDate(dayjs().format('YYYY-MM-DD')); setNotes(''); setAttend(true)
    setItems([]); setDraftRestored(false); setOpen('info')
  }
  const cancel = () => { if (!id) clearWorkoutDraft(user.id); nav('/workouts') }

  const upd = (i, patch) => setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  const updQuick = (i, patch) => upd(i, { quick: { ...items[i].quick, ...patch } })
  const updSet = (i, j, patch) => upd(i, { sets: items[i].sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) })
  const toggleSetDone = (i, j) => {
    const next = !items[i].sets[j].done
    updSet(i, j, { done: next })
    if (next) timerRef.current?.restart()
  }
  // Nueva serie = copia de la anterior (peso y reps), para cargar más rápido
  const addSet = (i) => {
    const last = items[i].sets.at(-1)
    upd(i, { sets: [...items[i].sets, last ? { ...last, notes: '', showNote: false, done: false } : emptySet()] })
  }
  // Rápido → detallado: genera las series para poder corregir una por una
  const toDetail = (i) => {
    const { quick: q } = items[i]
    // Si la carga rápida está incompleta, se precarga lo que haya (peso mínimo y reps en cada serie)
    const n = Math.min(Math.max(parseInt(q.series, 10) || 1, 1), 20)
    const sets = quickError(q) ? Array.from({ length: n }, () => ({ weight_kg: q.min, reps: q.reps, notes: '', done: false })) : buildSets(q).map((s) => ({ ...s, done: false }))
    upd(i, { mode: 'detail', sets })
  }
  const toQuick = (i) => upd(i, { mode: 'quick', quick: summarize(items[i].sets) })

  // Del catálogo wger: si no está en mis ejercicios, lo crea
  const ensureExercise = async (x) => {
    if (catalog.some((c) => c.id === x.id)) return x
    const found = catalog.find((c) => norm(c.name) === norm(x.name))
    if (found) return found
    const { data, error } = await insertExercise({ name: x.name, muscle_group: x.muscle_group, description: x.description, image_url: x.image ?? null, user_id: user.id })
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
    await addItem(ex)
  }
  // Ejercicio propio creado desde el buscador: se guarda (con su foto) y se agrega al entrenamiento
  const createExercise = async ({ name, muscle_group, file }) => {
    const existing = catalog.find((c) => norm(c.name) === norm(name))
    if (existing) { await addItem(existing); return }
    try {
      const image_url = file ? await uploadExerciseImage(file, user.id) : null
      const { data, error } = await insertExercise({ name, muscle_group, image_url, user_id: user.id })
      if (error) return error.message
      setCatalog((c) => [...c, data])
      await addItem(data)
    } catch (err) {
      return err.message
    }
  }
  const addItem = async (ex) => {
    const prev = await lastSets(ex.id)
    // Se precarga lo de la última vez; si es la primera, carga rápida vacía
    // El ejercicio nuevo queda abierto y se pliega lo demás
    setOpen(count.current)
    if (mobile) { setPicking(false); justAdded.current = true }
    setItems((list) => [...list, prev?.sets.length ? toItem(ex.id, prev.sets, { prev }) : { ...toItem(ex.id, []), mode: 'quick', quick: emptyQuick() }])
  }
  // Después de agregar desde la pantalla del buscador, se lleva a la vista la card del ejercicio nuevo
  useEffect(() => {
    if (!justAdded.current || typeof open !== 'number') return
    justAdded.current = false
    requestAnimationFrame(() => document.getElementById(`ex-${open}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }, [open, items.length])
  // Con el buscador a pantalla completa, la página de atrás no scrollea
  useEffect(() => {
    const sheet = mobile && picking
    document.body.classList.toggle('sheet-open', sheet)
    return () => document.body.classList.remove('sheet-open')
  }, [mobile, picking])

  const removeItem = (i) => {
    setItems(items.filter((_, k) => k !== i))
    if (open === i) setOpen(null)
    else if (typeof open === 'number' && open > i) setOpen(open - 1)
  }
  const exName = (exId) => catalog.find((c) => c.id === exId)?.[C.exerciseName] ?? 'Ejercicio'

  const save = async (e) => {
    e.preventDefault(); setError('')
    // Al fallar, se abre la sección con el problema (en celular puede estar plegada)
    const fail = (section, msg) => { setOpen(section); setError(msg) }
    if (!name.trim()) return fail('info', 'Poné un nombre al entrenamiento')
    if (!date) return fail('info', 'Elegí la fecha del entrenamiento')
    if (items.length === 0) return setError('Agregá al menos un ejercicio')
    for (const [i, it] of items.entries()) {
      if (!it.exercise_id) return fail(i, `Elegí el ejercicio #${i + 1}`)
      if (it.mode === 'quick') {
        const msg = quickError(it.quick)
        if (msg) return fail(i, `${exName(it.exercise_id)}: ${msg}`)
      } else {
        if (it.sets.length === 0) return fail(i, `${exName(it.exercise_id)}: agregá al menos una serie`)
        for (const s of it.sets) {
          if (s.reps === '' || !Number.isInteger(Number(s.reps)) || Number(s.reps) < 1 || s.weight_kg === '' || Number(s.weight_kg) < 0)
            return fail(i, `Revisá las series de ${exName(it.exercise_id)}: peso y repeticiones son obligatorios (repeticiones enteras desde 1, peso sin negativos)`)
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
    if (!id) clearWorkoutDraft(user.id)
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
      {draftRestored && (
        <div className="alert alert-secondary py-2 d-flex flex-wrap align-items-center justify-content-between gap-2" role="status">
          <span>Recuperamos un borrador sin guardar.</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={discardDraft}>Descartar</button>
        </div>
      )}
      <ErrorMsg error={error} />
      <RestTimerBar ref={timerRef} />
      <section className="card mb-3" aria-labelledby="wf-info">
        <h2 className="acc-h m-0">
          <button type="button" id="wf-info" className="acc-head" onClick={() => toggle('info')} aria-expanded={isOpen('info')} aria-controls="wf-info-body" disabled={!mobile}>
            <span className="min-w-0">
              <span className="acc-title">Datos del entrenamiento</span>
              {!isOpen('info') && <span className="acc-sub">{name.trim() || 'Sin nombre'} · {date ? dayjs(date).format('ddd DD/MM') : 'sin fecha'}</span>}
            </span>
            {mobile && (isOpen('info') ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />)}
          </button>
        </h2>
        {isOpen('info') && (
      <div className={`row g-2 px-3 pb-3 ${mobile ? 'acc-anim' : ''}`} id="wf-info-body">
        <div className="col-12 col-md-6"><label className="form-label" htmlFor="wf-name">Nombre</label><input id="wf-name" className="form-control" placeholder="Ej.: Pecho y tríceps" aria-invalid={error.startsWith('Poné un nombre') || undefined} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="col-12 col-md-6"><label className="form-label" htmlFor="wf-date">Fecha</label><input id="wf-date" type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="col-12"><label className="form-label" htmlFor="wf-notes">Notas</label><textarea id="wf-notes" className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="col-12 form-check ms-2"><input id="att" type="checkbox" className="form-check-input" checked={attend} onChange={(e) => setAttend(e.target.checked)} /><label htmlFor="att" className="form-check-label">Registrar asistencia ese día</label></div>
      </div>
        )}
      </section>

      {items.map((it, i) => {
        const exLabel = exName(it.exercise_id)
        // Error en vivo solo para un valor cargado que es inválido; un campo todavía vacío no es error
        const found = it.mode === 'quick' ? quickIssue(it.quick) : null
        const issue = found && it.quick[found.field] !== '' ? found : null
        const preview = it.mode === 'quick' && !quickError(it.quick) ? buildSets(it.quick) : null
        const inv = (f) => (issue?.field === f ? true : undefined)
        const summary = itemSummary(it)
        // Plegado (solo celular): un renglón con el resumen; al tocarlo se despliega para editar
        if (!isOpen(i)) return (
          <section className="card mb-2" key={i} aria-labelledby={`ex-${i}`}>
            <h2 className="acc-h m-0">
              <button type="button" id={`ex-${i}`} className="acc-head" onClick={() => toggle(i)} aria-expanded="false" aria-controls={`exb-${i}`}>
                <span className="min-w-0">
                  <span className="acc-title text-truncate">{i + 1}. {exLabel}</span>
                  <span className={`acc-sub ${summary ? '' : 'text-danger-emphasis'}`}>{summary ?? 'Falta completar'}{it.notes ? ' · con nota' : ''}</span>
                </span>
                <ChevronDown size={20} aria-hidden="true" />
              </button>
            </h2>
          </section>
        )
        return (
          <section className="card mb-3" key={i} aria-labelledby={`ex-${i}`}>
            <div className={`card-body p-3 ${mobile ? 'acc-anim' : ''}`} id={`exb-${i}`}>
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div className="min-w-0">
                  <h2 className="acc-h m-0">
                    <button type="button" id={`ex-${i}`} className="acc-head acc-head-inline" onClick={() => toggle(i)} aria-expanded="true" aria-controls={`exb-${i}`} disabled={!mobile}>
                      <span className="acc-title text-truncate">{i + 1}. {exLabel}</span>
                      {mobile && <ChevronUp size={20} aria-hidden="true" />}
                    </button>
                  </h2>
                  {it.prev && <small className="text-muted">Última vez ({dayjs(it.prev.date).format('DD/MM')}): {describe(it.prev.sets)}</small>}
                </div>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(i)} aria-label={`Quitar ${exLabel}`}>Quitar</button>
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
                        <button type="button" className={`set-done ${s.done ? 'is-done' : ''}`} aria-pressed={!!s.done}
                          aria-label={`Serie ${j + 1}: ${s.done ? 'hecha' : 'marcar como hecha'}`}
                          title={s.done ? 'Serie hecha' : 'Marcar serie como hecha y arrancar el descanso'}
                          onClick={() => toggleSetDone(i, j)}>
                          {s.done ? <Check size={14} aria-hidden="true" /> : j + 1}
                        </button>
                        <input type="number" inputMode="decimal" min="0" step="any" className="form-control" aria-label={`Peso serie ${j + 1} (kg)`} value={s.weight_kg} onChange={(e) => updSet(i, j, { weight_kg: e.target.value })} />
                        <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" className="form-control" aria-label={`Repeticiones serie ${j + 1}`} value={s.reps} onChange={(e) => updSet(i, j, { reps: e.target.value })} />
                        <button type="button" className={`btn btn-outline-secondary ${s.notes || s.showNote ? 'active' : ''}`} aria-pressed={!!(s.notes || s.showNote)} aria-label={`Nota serie ${j + 1}`} onClick={() => updSet(i, j, { showNote: !s.showNote })}><Pencil size={16} aria-hidden="true" /></button>
                        <button type="button" className="btn btn-outline-secondary" aria-label={`Quitar serie ${j + 1}`} onClick={() => upd(i, { sets: it.sets.filter((_, k) => k !== j) })}><X size={16} aria-hidden="true" /></button>
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

      {picking && (mobile ? createPortal(
        <div className="picker-sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title" onKeyDown={(e) => e.key === 'Escape' && setPicking(false)}>
          <div className="picker-sheet-head">
            <h2 id="picker-title" className="h5 m-0">Agregar ejercicio</h2>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPicking(false)} aria-label="Cerrar y volver al entrenamiento" autoFocus><X size={20} aria-hidden="true" /></button>
          </div>
          <div className="picker-sheet-body"><ExercisePicker mine={catalog} onPick={addExercise} onCreate={createExercise} includeMine /></div>
        </div>, document.body
      ) : <ExercisePicker mine={catalog} onPick={addExercise} onCreate={createExercise} includeMine />)}

      <div className="form-actions">
        <button className="btn btn-primary fa-save" disabled={saving}>{saving ? 'Guardando…' : 'Guardar entrenamiento'}</button>
        <button type="button" className={`btn ${picking ? 'btn-outline-secondary' : 'btn-outline-primary'}`} aria-expanded={picking} onClick={() => setPicking(!picking)}>{picking && !mobile ? 'Cerrar buscador' : <><Plus size={18} aria-hidden="true" />Agregar ejercicio</>}</button>
        <button type="button" className="btn btn-outline-secondary" onClick={cancel}>Cancelar</button>
      </div>
    </form>
  )
}
