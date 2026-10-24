import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { ErrorMsg } from '../components/Layout'
import ConfirmButton from '../components/ConfirmButton'
import TrainingTabs from '../components/TrainingTabs'

export default function Workouts() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    const { data, error } = await supabase.from(T.workouts).select('*').order('workout_date', { ascending: false })
    if (error) setError(error.message); else setList(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  const del = async (id) => {
    const { error } = await supabase.from(T.workouts).delete().eq('id', id)
    if (error) setError(error.message); else load()
  }
  return (
    <>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h4 m-0">Entrenos</h1>
        <Link to="/workouts/new" className="btn btn-primary text-nowrap">
          <span className="d-none d-sm-inline">Nuevo entrenamiento</span>
          <span className="d-sm-none">+ Nuevo</span>
        </Link>
      </div>
      <TrainingTabs />
      <ErrorMsg error={error} />
      {loading ? <p role="status">Cargando…</p> : list.length === 0 ? <p className="text-muted">Todavía no registraste entrenamientos.</p> : (
        <ul className="list-group">
          {list.map((w) => (
            <li key={w.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
              <span className="min-w-0">
                <strong className="d-block text-truncate">{w.name}</strong>
                <small className="text-muted">{dayjs(w.workout_date).format('ddd DD/MM/YYYY')}</small>
              </span>
              <span className="d-flex gap-2 flex-none">
                <Link className="btn btn-sm btn-outline-primary" to={`/workouts/${w.id}`} aria-label={`Editar ${w.name}`}>Editar</Link>
                <ConfirmButton what={w.name} onConfirm={() => del(w.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
