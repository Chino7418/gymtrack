import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Profile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ first_name:'', last_name:'', username:'', birth_date:'', height_cm:'' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name||'',
        last_name: profile.last_name||'',
        username: profile.username||'',
        birth_date: profile.birth_date||'',
        height_cm: profile.height_cm||''
      })
    }
  }, [profile])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setLoading(true); setMsg('')
    const { error } = await supabase.from('profiles').update({
      first_name: form.first_name,
      last_name: form.last_name,
      username: form.username,
      birth_date: form.birth_date || null,
      height_cm: form.height_cm || null,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setLoading(false)
    setMsg(error ? error.message : 'Perfil actualizado')
  }

  return (
    <div className="card p-3">
      <h5>Perfil</h5>
      {msg && <div className="alert alert-info py-2">{msg}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-2"><label className="form-label">Nombre</label><input className="form-control" name="first_name" value={form.first_name} onChange={handleChange} required /></div>
          <div className="col-md-6 mb-2"><label className="form-label">Apellido</label><input className="form-control" name="last_name" value={form.last_name} onChange={handleChange} required /></div>
        </div>
        <div className="mb-2"><label className="form-label">Nombre de usuario</label><input className="form-control" name="username" value={form.username} onChange={handleChange} required /></div>
        <div className="mb-2"><label className="form-label">Fecha de nacimiento (opcional)</label><input type="date" className="form-control" name="birth_date" value={form.birth_date} onChange={handleChange} /></div>
        <div className="mb-3"><label className="form-label">Altura cm (opcional)</label><input type="number" step="0.01" min="0" className="form-control" name="height_cm" value={form.height_cm} onChange={handleChange} /></div>
        <button className="btn btn-primary" disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
      </form>
    </div>
  )
}
