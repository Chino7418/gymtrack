import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

export default function Profile() {
  const { user } = useAuth()
  const [f, setF] = useState({ first_name: '', last_name: '', username: '', birth_date: '', height_cm: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    supabase.from(T.profiles).select('*').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message)
      else if (data) setF({
        first_name: data.first_name ?? '', last_name: data.last_name ?? '', username: data.username ?? '',
        birth_date: data.birth_date ?? '', height_cm: data.height_cm ?? '',
      })
      setLoading(false)
    })
  }, [user.id])

  const save = async (e) => {
    e.preventDefault(); setError(''); setOk(false)
    if (!f.first_name.trim() || !f.last_name.trim() || !f.username.trim()) return setError('Nombre, apellido y usuario son obligatorios')
    if (f.height_cm !== '' && (Number(f.height_cm) <= 0 || Number(f.height_cm) >= 300)) return setError('La altura debe estar entre 1 y 299 cm')
    const { error } = await supabase.from(T.profiles).update({
      first_name: f.first_name.trim(), last_name: f.last_name.trim(), username: f.username.trim(),
      birth_date: f.birth_date || null, height_cm: f.height_cm === '' ? null : Number(f.height_cm),
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (error) setError(error.code === '23505' ? 'Ese nombre de usuario ya está en uso' : error.message)
    else setOk(true)
  }

  if (loading) return <p>Cargando…</p>
  return (
    <form onSubmit={save} style={{ maxWidth: 420 }}>
      <h1 className="h4 mb-3">Perfil</h1>
      <ErrorMsg error={error} />
      {ok && <div className="alert alert-success py-2">Perfil guardado.</div>}
      <label className="form-label">Email</label>
      <input className="form-control mb-2" value={user.email} disabled />
      <label className="form-label">Nombre</label>
      <input className="form-control mb-2" value={f.first_name} onChange={set('first_name')} />
      <label className="form-label">Apellido</label>
      <input className="form-control mb-2" value={f.last_name} onChange={set('last_name')} />
      <label className="form-label">Usuario</label>
      <input className="form-control mb-2" value={f.username} onChange={set('username')} />
      <label className="form-label">Fecha de nacimiento</label>
      <input type="date" className="form-control mb-2" value={f.birth_date} onChange={set('birth_date')} />
      <label className="form-label">Altura (cm)</label>
      <input type="number" step="0.1" min="0" className="form-control mb-3" value={f.height_cm} onChange={set('height_cm')} />
      <button className="btn btn-primary">Guardar cambios</button>
    </form>
  )
}
