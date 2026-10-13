import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function WorkoutDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [w, setW] = useState(null)

  useEffect(()=>{
    if (!user) return
    supabase.from('workouts').select('*,workout_exercises(*,exercise_id,exercises(id,name,muscle_group),workout_sets(*))').eq('id',id).eq('user_id',user.id).single().then(({data})=>{
      setW(data)
    })
  },[user,id])

  const del = async () => {
    if (!confirm('Eliminar entrenamiento?')) return
    await supabase.from('workouts').delete().eq('id',id).eq('user_id',user.id)
    navigate('/workouts')
  }

  if (!w) return <p>Cargando...</p>

  return (
    <div className="card p-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>{w.workout_date} {w.name && <span>· {w.name}</span>}</h5>
        <div className="btn-group btn-group-sm">
          <Link className="btn btn-outline-light" to={`/workouts/${w.id}/edit`}>Editar</Link>
          <button className="btn btn-outline-danger" onClick={del}>Eliminar</button>
        </div>
      </div>
      {w.notes && <p className="text-muted">{w.notes}</p>}
      {(w.workout_exercises||[]).sort((a,b)=>a.position-b.position).map(we=>(
        <div key={we.id} className="mb-3">
          <h6>{we.exercises?.name} <small className="text-muted">({we.exercises?.muscle_group})</small></h6>
          {we.notes && <small className="text-muted">{we.notes}</small>}
          <table className="table table-sm">
            <thead><tr><th>#</th><th>Peso kg</th><th>Reps</th><th>Notas</th></tr></thead>
            <tbody>
              {(we.workout_sets||[]).sort((a,b)=>a.set_number-b.set_number).map(s=>(
                <tr key={s.id}><td>{s.set_number}</td><td>{s.weight_kg}</td><td>{s.reps}</td><td>{s.notes}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <Link to="/workouts" className="btn btn-sm btn-secondary">Volver</Link>
    </div>
  )
}
