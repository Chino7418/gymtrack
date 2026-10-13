import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'

const MUSCLES = ['Pecho','Espalda','Hombros','Biceps','Triceps','Piernas','Gluteos','Abdomen','Otro']

export default function Exercises() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [filter, setFilter] = useState({ q:'', muscle:'' })
  const [form, setForm] = useState({ id:null, name:'', muscle_group:'Pecho', description:'', is_active:true })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    if (!user) return
    let q = supabase.from('exercises').select('*').eq('user_id', user.id).order('created_at',{ascending:false})
    if (filter.q) q = q.ilike('name', `%${filter.q}%`)
    if (filter.muscle) q = q.eq('muscle_group', filter.muscle)
    const { data } = await q
    setList(data||[])
  }

  useEffect(()=>{ load() },[user,filter.q,filter.muscle])

  const resetForm = () => setForm({ id:null, name:'', muscle_group:'Pecho', description:'', is_active:true })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setLoading(true); setMsg('')
    if (form.id) {
      const { error } = await supabase.from('exercises').update({ name:form.name, muscle_group:form.muscle_group, description:form.description||null, is_active:form.is_active, updated_at:new Date().toISOString() }).eq('id',form.id).eq('user_id',user.id)
      setMsg(error?'Error':'Actualizado')
    } else {
      const { error } = await supabase.from('exercises').insert({ user_id:user.id, name:form.name, muscle_group:form.muscle_group, description:form.description||null, is_active:true })
      setMsg(error?'Error':'Creado')
    }
    setLoading(false)
    resetForm(); load()
  }

  const edit = (ex) => setForm({ id:ex.id, name:ex.name, muscle_group:ex.muscle_group, description:ex.description||'', is_active:ex.is_active })

  const toggleActive = async (ex) => {
    await supabase.from('exercises').update({ is_active:!ex.is_active, updated_at:new Date().toISOString() }).eq('id',ex.id).eq('user_id',user.id)
    load()
  }

  const del = async (ex) => {
    if (!confirm('Eliminar ejercicio?')) return
    // check dependencies
    const { count } = await supabase.from('workout_exercises').select('*',{count:'exact',head:true}).eq('exercise_id',ex.id)
    if (count>0) { alert('No se puede eliminar: tiene historial. Desactívalo.'); return }
    await supabase.from('exercises').delete().eq('id',ex.id).eq('user_id',user.id)
    load()
  }

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="card p-3">
          <h6>{form.id?'Editar':'Nuevo'} ejercicio</h6>
          <form onSubmit={handleSubmit}>
            <div className="mb-2"><label className="form-label">Nombre</label><input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div className="mb-2"><label className="form-label">Grupo muscular</label><select className="form-select" value={form.muscle_group} onChange={e=>setForm({...form,muscle_group:e.target.value})}>{MUSCLES.map(m=><option key={m}>{m}</option>)}</select></div>
            <div className="mb-2"><label className="form-label">Descripción (opcional)</label><textarea className="form-control" rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}></textarea></div>
            {form.id && <div className="form-check mb-2"><input className="form-check-input" type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/><label className="form-check-label">Activo</label></div>}
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={loading}>{form.id?'Guardar':'Crear'}</button>
              {form.id && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>}
            </div>
          </form>
          {msg && <div className="small mt-2 text-muted">{msg}</div>}
        </div>
      </div>
      <div className="col-lg-8">
        <div className="card p-3">
          <h6>Mis ejercicios</h6>
          <div className="row g-2 mb-2">
            <div className="col-sm-6"><input className="form-control" placeholder="Buscar por nombre" value={filter.q} onChange={e=>setFilter({...filter,q:e.target.value})}/></div>
            <div className="col-sm-6"><select className="form-select" value={filter.muscle} onChange={e=>setFilter({...filter,muscle:e.target.value})}><option value="">Todos los grupos</option>{MUSCLES.map(m=><option key={m}>{m}</option>)}</select></div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Nombre</th><th>Grupo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {list.map(ex=>(
                  <tr key={ex.id}>
                    <td>{ex.name}</td><td>{ex.muscle_group}</td><td>{ex.is_active?'Activo':'Inactivo'}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-light me-1" onClick={()=>edit(ex)}>Editar</button>
                      <button className="btn btn-sm btn-outline-light me-1" onClick={()=>toggleActive(ex)}>{ex.is_active?'Desactivar':'Activar'}</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>del(ex)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {list.length===0 && <tr><td colSpan="4" className="text-center text-muted">Sin ejercicios</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
