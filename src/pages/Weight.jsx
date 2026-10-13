import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Weight() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState({ recorded_date: new Date().toISOString().slice(0,10), weight_kg:'', notes:'' })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('body_weight_entries').select('*').eq('user_id',user.id).order('recorded_date',{ascending:true})
    setList(data||[])
  }

  useEffect(()=>{ load() },[user])

  const save = async (e) => {
    e.preventDefault()
    if (!user) return
    setMsg('')
    if (editId) {
      const { error } = await supabase.from('body_weight_entries').update({ recorded_date:form.recorded_date, weight_kg:form.weight_kg, notes:form.notes||null, updated_at:new Date().toISOString() }).eq('id',editId).eq('user_id',user.id)
      setMsg(error?'Error':'Actualizado')
    } else {
      const { error } = await supabase.from('body_weight_entries').insert({ user_id:user.id, recorded_date:form.recorded_date, weight_kg:form.weight_kg, notes:form.notes||null })
      setMsg(error?'Error':'Registrado')
    }
    setEditId(null); setForm({ recorded_date: new Date().toISOString().slice(0,10), weight_kg:'', notes:'' }); load()
  }

  const edit = (r) => { setEditId(r.id); setForm({ recorded_date:r.recorded_date, weight_kg:r.weight_kg, notes:r.notes||'' }) }
  const del = async (id) => { if(!confirm('Eliminar registro?')) return; await supabase.from('body_weight_entries').delete().eq('id',id).eq('user_id',user.id); load() }
  const cancel = () => { setEditId(null); setForm({ recorded_date: new Date().toISOString().slice(0,10), weight_kg:'', notes:'' }) }

  const first = list[0]
  const last = list[list.length-1]
  const diff = (last && first) ? (Number(last.weight_kg)-Number(first.weight_kg)).toFixed(2) : null

  const chartData = {
    labels: list.map(l=>l.recorded_date),
    datasets: [{ label:'Peso kg', data: list.map(l=>l.weight_kg), borderColor:'#ff6b35', backgroundColor:'rgba(255,107,53,.3)' }]
  }

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="card p-3">
          <h6>{editId?'Editar':'Registrar'} peso</h6>
          <form onSubmit={save}>
            <div className="mb-2"><label className="form-label">Fecha</label><input type="date" className="form-control" value={form.recorded_date} onChange={e=>setForm({...form,recorded_date:e.target.value})} required /></div>
            <div className="mb-2"><label className="form-label">Peso kg</label><input type="number" step="0.01" min="0" className="form-control" value={form.weight_kg} onChange={e=>setForm({...form,weight_kg:e.target.value})} required /></div>
            <div className="mb-2"><label className="form-label">Observaciones</label><input className="form-control" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            <div className="d-flex gap-2"><button className="btn btn-primary">{editId?'Guardar':'Registrar'}</button>{editId && <button type="button" className="btn btn-secondary" onClick={cancel}>Cancelar</button>}</div>
          </form>
          {msg && <div className="small mt-2">{msg}</div>}
          <div className="mt-3 small">
            <div>Último: {last? `${last.weight_kg} kg (${last.recorded_date})`:'-'}</div>
            <div>Primero: {first? `${first.weight_kg} kg (${first.recorded_date})`:'-'}</div>
            <div>Diferencia: {diff!=null? `${diff} kg`: '-'}</div>
          </div>
        </div>
      </div>
      <div className="col-lg-8">
        <div className="card p-3">
          <h6>Historial y evolución</h6>
          {list.length>=2 && <Line data={chartData} options={{responsive:true,plugins:{legend:{labels:{color:'#fff'}}},scales:{x:{ticks:{color:'#fff'}},y:{ticks:{color:'#fff'}}}}} />}
          {list.length<2 && <div className="text-muted">Necesitás al menos 2 registros para ver gráfico</div>}
          <div className="table-responsive mt-3">
            <table className="table table-sm">
              <thead><tr><th>Fecha</th><th>Peso kg</th><th>Notas</th><th></th></tr></thead>
              <tbody>
                {list.map(r=>(
                  <tr key={r.id}><td>{r.recorded_date}</td><td>{r.weight_kg}</td><td>{r.notes||'-'}</td>
                    <td className="text-end"><button className="btn btn-sm btn-outline-light me-1" onClick={()=>edit(r)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={()=>del(r.id)}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
