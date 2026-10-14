import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'
import dayjs from 'dayjs'

export default function Attendance() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState({ attendance_date: dayjs().format('YYYY-MM-DD'), check_in_time:'', notes:'', workout_id:null })
  const [workouts, setWorkouts] = useState([])
  const [msg, setMsg] = useState('')
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [editId, setEditId] = useState(null)

  const load = async () => {
    if (!user) return
    const start = dayjs(month+'-01').startOf('month').format('YYYY-MM-DD')
    const end = dayjs(month+'-01').endOf('month').format('YYYY-MM-DD')
    const [{data:att},{data:wo}] = await Promise.all([
      supabase.from('gym_attendances').select('*').eq('user_id',user.id).gte('attendance_date',start).lte('attendance_date',end).order('attendance_date',{ascending:false}),
      supabase.from('workouts').select('id,workout_date,name').eq('user_id',user.id).order('workout_date',{ascending:false}).limit(20)
    ])
    setList(att||[])
    setWorkouts(wo||[])
  }

  useEffect(()=>{ load() },[user,month])

  const save = async (e) => {
    e.preventDefault()
    if (!user) return
    setMsg('')
    if (editId) {
      const { error } = await supabase.from('gym_attendances').update({ attendance_date:form.attendance_date, check_in_time:form.check_in_time||null, notes:form.notes||null, workout_id:form.workout_id||null }).eq('id',editId).eq('user_id',user.id)
      setMsg(error?'Error':'Actualizado')
    } else {
      const { error } = await supabase.from('gym_attendances').insert({ user_id:user.id, attendance_date:form.attendance_date, check_in_time:form.check_in_time||null, notes:form.notes||null, workout_id:form.workout_id||null })
      setMsg(error?'Error':'Registrado')
    }
    setEditId(null)
    setForm({ attendance_date: dayjs().format('YYYY-MM-DD'), check_in_time:'', notes:'', workout_id:null })
    load()
  }

  const edit = (a) => { setEditId(a.id); setForm({ attendance_date:a.attendance_date, check_in_time:a.check_in_time||'', notes:a.notes||'', workout_id:a.workout_id||null }) }
  const del = async (id) => { if(!confirm('Eliminar asistencia?')) return; await supabase.from('gym_attendances').delete().eq('id',id).eq('user_id',user.id); load() }
  const cancel = () => { setEditId(null); setForm({ attendance_date: dayjs().format('YYYY-MM-DD'), check_in_time:'', notes:'', workout_id:null }) }

  const totalMonth = list.length
  const totalYear = 0

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="card p-3">
          <h6>{editId?'Editar':'Registrar'} asistencia</h6>
          <form onSubmit={save}>
            <div className="mb-2"><label className="form-label">Fecha</label><input type="date" className="form-control" value={form.attendance_date} onChange={e=>setForm({...form,attendance_date:e.target.value})} required /></div>
            <div className="mb-2"><label className="form-label">Hora ingreso (opcional)</label><input type="time" className="form-control" value={form.check_in_time} onChange={e=>setForm({...form,check_in_time:e.target.value})} /></div>
            <div className="mb-2"><label className="form-label">Asociar a entrenamiento (opcional)</label><select className="form-select" value={form.workout_id||''} onChange={e=>setForm({...form,workout_id:e.target.value||null})}><option value="">Sin asociar</option>{workouts.map(w=><option key={w.id} value={w.id}>{w.workout_date} {w.name}</option>)}</select></div>
            <div className="mb-2"><label className="form-label">Observaciones</label><input className="form-control" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary">{editId?'Guardar':'Registrar'}</button>
              {editId && <button type="button" className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
            </div>
          </form>
          {msg && <div className="small mt-2">{msg}</div>}
        </div>
        <div className="card p-3 mt-3">
          <small className="text-muted">Mes: {month}</small>
          <div>Total asistencias mes: <strong>{totalMonth}</strong></div>
        </div>
      </div>
      <div className="col-lg-8">
        <div className="card p-3">
          <div className="d-flex justify-content-between mb-2"><h6>Asistencias</h6><input type="month" className="form-control w-auto" value={month} onChange={e=>setMonth(e.target.value)} /></div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Fecha</th><th>Hora</th><th>Notas</th><th></th></tr></thead>
              <tbody>
                {list.map(a=>(
                  <tr key={a.id}><td>{a.attendance_date}</td><td>{a.check_in_time||'-'}</td><td>{a.notes||'-'}</td>
                    <td className="text-end"><button className="btn btn-sm btn-outline-light me-1" onClick={()=>edit(a)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={()=>del(a.id)}>Eliminar</button></td>
                  </tr>
                ))}
                {list.length===0 && <tr><td colSpan="4" className="text-center text-muted">Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
