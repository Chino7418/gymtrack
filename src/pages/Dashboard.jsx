import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import RestTimer from '../components/RestTimer'
import './dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [goalInput, setGoalInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const start = dayjs().startOf('month').format('YYYY-MM-DD')
    const end = dayjs().endOf('month').format('YYYY-MM-DD')
    const [w, p, m, tot, last] = await Promise.all([
      supabase.from(T.weights).select('*').order(C.weightDate, { ascending: false }).limit(2),
      supabase.from(T.profiles).select('*').eq('id', user.id).maybeSingle(),
      supabase.from(T.attendances).select('id', { count: 'exact', head: true }).gte('attendance_date', start).lte('attendance_date', end),
      supabase.from(T.attendances).select('id', { count: 'exact', head: true }),
      supabase.from(T.workouts).select('id,name,workout_date').order('workout_date', { ascending: false }).limit(1),
    ])
    const err = [w, p, m, tot, last].find((r) => r.error)?.error
    if (err) setError(err.message)
    setData({
      current: w.data?.[0] ?? null,
      previous: w.data?.[1] ?? null,
      goal: p.data?.goal_weight_kg ?? null,
      name: p.data?.first_name ?? '',
      month: m.count ?? 0,
      total: tot.count ?? 0,
      lastWorkout: last.data?.[0] ?? null,
    })
  }
  useEffect(() => { load() }, [])

  const openGoal = () => { setGoalInput(data.goal != null ? String(data.goal) : ''); setEditing(true) }
  const saveGoal = async (e) => {
    e.preventDefault(); setError('')
    const n = Number(goalInput)
    if (!(n > 0 && n < 500)) return setError('Ingresá un objetivo entre 1 y 499 kg')
    const { error } = await supabase.from(T.profiles).update({ goal_weight_kg: n }).eq('id', user.id)
    if (error) return setError(error.message)
    setEditing(false); load()
  }

  if (!data) return <p role="status">Cargando…</p>
  const cur = data.current ? Number(data.current[C.weightValue]) : null
  const prev = data.previous ? Number(data.previous[C.weightValue]) : null
  const goal = data.goal != null ? Number(data.goal) : null
  const diff = cur != null && goal != null ? goal - cur : null
  const change = cur != null && prev != null ? cur - prev : null

  const pesoSub = cur == null ? 'Registrar'
    : `${dayjs(data.current[C.weightDate]).format('DD/MM')}${change ? ` · ${change > 0 ? '+' : ''}${change.toFixed(1)}` : ''}`
  const objSub = goal == null ? 'Definir'
    : diff == null ? 'Cambiar'
    : Math.abs(diff) < 0.05 ? '¡Logrado!' : `Faltan ${Math.abs(diff).toFixed(1)} kg`

  return (
    <>
      <h1 className="h4 mb-2">{data.name ? `Hola, ${data.name}` : 'Inicio'}</h1>
      <ErrorMsg error={error} />

      <div className="row g-2 g-md-3 mb-2 mb-md-3">
        <div className="col-4">
          <Link to="/weight" className="card stat h-100">
            <span className="stat-label">Peso</span>
            <span className="stat-value">{cur ?? '—'}{cur != null && <small>kg</small>}</span>
            <span className="stat-sub">{pesoSub}</span>
          </Link>
        </div>
        <div className="col-4">
          <button type="button" className="card stat h-100" onClick={openGoal} aria-expanded={editing} aria-controls="goal-form">
            <span className="stat-label">Objetivo</span>
            <span className="stat-value">{goal ?? '—'}{goal != null && <small>kg</small>}</span>
            <span className="stat-sub">{objSub}</span>
          </button>
        </div>
        <div className="col-4">
          <Link to="/attendance" className="card stat h-100">
            <span className="stat-label">Asistencia</span>
            <span className="stat-value">{data.month}<small>días</small></span>
            <span className="stat-sub">{dayjs().format('MMM')} · {data.total} total</span>
          </Link>
        </div>
      </div>

      {editing && (
        <form id="goal-form" onSubmit={saveGoal} className="card card-body p-3 mb-2 mb-md-3">
          <label className="stat-label mb-1" htmlFor="goal">Peso objetivo (kg)</label>
          <div className="d-flex flex-wrap gap-2">
            <input id="goal" autoFocus type="number" inputMode="decimal" step="any" min="0" style={{ flex: '1 1 6rem' }} className="form-control" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
            <button className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="row g-2 g-md-3">
        <div className="col-12 col-lg-7"><RestTimer /></div>
        <div className="col-12 col-lg-5">
          <div className="card h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between gap-2">
              <div className="min-w-0">
                <h2 className="stat-label mb-0">Último entrenamiento</h2>
                {data.lastWorkout ? (
                  <><strong className="d-block text-truncate">{data.lastWorkout.name}</strong>
                    <span className="text-muted small">{dayjs(data.lastWorkout.workout_date).format('ddd DD/MM')}</span></>
                ) : <div className="text-muted small">Todavía no registraste ninguno</div>}
              </div>
              <Link to="/workouts/new" className="btn btn-primary text-nowrap">
                <span className="d-none d-sm-inline">Nuevo entrenamiento</span>
                <span className="d-sm-none">+ Nuevo</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
