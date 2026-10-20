import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import RestTimer from '../components/RestTimer'

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

  const saveGoal = async (e) => {
    e.preventDefault(); setError('')
    const n = Number(goalInput)
    if (!(n > 0 && n < 500)) return setError('Ingresá un objetivo entre 1 y 499 kg')
    const { error } = await supabase.from(T.profiles).update({ goal_weight_kg: n }).eq('id', user.id)
    if (error) return setError(error.message)
    setEditing(false); load()
  }

  if (!data) return <p>Cargando…</p>
  const cur = data.current ? Number(data.current[C.weightValue]) : null
  const prev = data.previous ? Number(data.previous[C.weightValue]) : null
  const goal = data.goal != null ? Number(data.goal) : null
  const diff = cur != null && goal != null ? goal - cur : null
  const change = cur != null && prev != null ? cur - prev : null

  return (
    <>
      <h1 className="h4 mb-3">{data.name ? `Hola, ${data.name}` : 'Inicio'}</h1>
      <ErrorMsg error={error} />
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-muted">Peso actual</h2>
            {cur != null ? (
              <>
                <div className="display-5 fw-bold">{cur} <small className="fs-6">kg</small></div>
                <div className="small text-muted">{dayjs(data.current[C.weightDate]).format('DD/MM/YYYY')}
                  {change != null && change !== 0 && <> · {change > 0 ? '+' : ''}{change.toFixed(1)} kg vs. anterior</>}
                </div>
              </>
            ) : <p className="text-muted mb-0">Todavía no registraste tu peso.</p>}
            <Link to="/weight" className="btn btn-sm btn-outline-primary mt-3">Registrar peso</Link>
          </div></div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-muted">Objetivo</h2>
            {editing || goal == null ? (
              <form onSubmit={saveGoal} className="d-flex gap-2">
                <input type="number" step="0.1" min="0" className="form-control" placeholder="Peso objetivo (kg)"
                  value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
                <button className="btn btn-primary">Guardar</button>
              </form>
            ) : (
              <>
                <div className="display-5 fw-bold">{goal} <small className="fs-6">kg</small></div>
                {diff != null && (
                  <div className="small text-muted">
                    {Math.abs(diff) < 0.05 ? '¡Objetivo alcanzado!' : `Estás a ${Math.abs(diff).toFixed(1)} kg del objetivo`}
                  </div>
                )}
                <button className="btn btn-sm btn-outline-secondary mt-3" onClick={() => { setGoalInput(String(goal)); setEditing(true) }}>Cambiar objetivo</button>
              </>
            )}
          </div></div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-muted">Días asistidos</h2>
            <div className="display-5 fw-bold">{data.month}</div>
            <div className="small text-muted">en {dayjs().format('MMMM')} · {data.total} en total</div>
            <Link to="/attendance" className="btn btn-sm btn-outline-primary mt-3">Ver calendario</Link>
          </div></div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7"><RestTimer /></div>
        <div className="col-12 col-lg-5">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 text-muted">Último entrenamiento</h2>
            {data.lastWorkout ? (
              <p className="mb-3"><strong>{data.lastWorkout.name}</strong><br />
                <span className="text-muted small">{dayjs(data.lastWorkout.workout_date).format('DD/MM/YYYY')}</span></p>
            ) : <p className="text-muted">Todavía no registraste entrenamientos.</p>}
            <Link to="/workouts/new" className="btn btn-primary">Nuevo entrenamiento</Link>
          </div></div>
        </div>
      </div>
    </>
  )
}
