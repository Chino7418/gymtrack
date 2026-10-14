import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { ErrorMsg } from '../components/Layout'

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
    if (!confirm('¿Borrar este entrenamiento?')) return
    const { error } = await supabase.from(T.workouts).delete().eq('id', id)
    if (error) setError(error.message); else load()
  }
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 m-0">Entrenamientos</h1>
        <Link to="/workouts/new" className="btn btn-primary">Nuevo entrenamiento</Link>
      </div>
      <ErrorMsg error={error} />
      {loading ? <p>Cargando…</p> : list.length === 0 ? <p className="text-muted">Todavía no registraste entrenamientos.</p> : (
        <ul className="list-group">
          {list.map((w) => (
            <li key={w.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span><strong>{w.name}</strong> <small className="text-muted ms-2">{dayjs(w.workout_date).format('DD/MM/YYYY')}</small></span>
              <span className="btn-group btn-group-sm">
                <Link className="btn btn-outline-primary" to={`/workouts/${w.id}`}>Editar</Link>
                <button className="btn btn-outline-danger" onClick={() => del(w.id)}>Borrar</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
