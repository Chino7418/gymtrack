import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { Link } from 'react-router-dom'

export default function Workouts() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [date, setDate] = useState('')

  const load = async () => {
    if (!user) return
    let q = supabase.from('workouts').select('id,workout_date,name,notes,created_at').eq('user_id',user.id).order('workout_date',{ascending:false})
    if (date) q = q.eq('workout_date', date)
    const { data } = await q
    setList(data||[])
  }

  useEffect(()=>{ load() },[user,date])

  const del = async (id) => {
    if (!confirm('Eliminar entrenamiento?')) return
    await supabase.from('workouts').delete().eq('id',id).eq('user_id',user.id)
    load()
  }

  return (
    <div className="card p-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>Entrenamientos</h5>
        <Link className="btn btn-primary btn-sm" to="/workouts/new">Nuevo</Link>
      </div>
      <div className="mb-2"><input type="date" className="form-control" value={date} onChange={e=>setDate(e.target.value)} /></div>
      <div className="list-group">
        {list.map(w=>(
          <div key={w.id} className="list-group-item bg-dark text-light d-flex justify-content-between align-items-center">
            <div>
              <strong>{w.workout_date}</strong> {w.name && <span>· {w.name}</span>}
              {w.notes && <div className="small text-muted">{w.notes}</div>}
            </div>
            <div className="btn-group btn-group-sm">
              <Link className="btn btn-outline-light" to={`/workouts/${w.id}`}>Ver</Link>
              <Link className="btn btn-outline-light" to={`/workouts/${w.id}/edit`}>Editar</Link>
              <button className="btn btn-outline-danger" onClick={()=>del(w.id)}>Eliminar</button>
            </div>
          </div>
        ))}
        {list.length===0 && <div className="text-muted">Sin entrenamientos</div>}
      </div>
    </div>
  )
}
