import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

export default function Profile() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from(T.profiles).select('*').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message)
      else setName(data?.[C.profileName] ?? '')
      setLoading(false)
    })
  }, [user.id])

  const save = async (e) => {
    e.preventDefault(); setError(''); setOk(false)
    const { error } = await supabase.from(T.profiles).update({ [C.profileName]: name.trim() }).eq('id', user.id)
    if (error) setError(error.message); else setOk(true)
  }
  if (loading) return <p>Cargando…</p>
  return (
    <form onSubmit={save} style={{ maxWidth: 420 }}>
      <h1 className="h4 mb-3">Perfil</h1>
      <ErrorMsg error={error} />
      {ok && <div className="alert alert-success py-2">Perfil guardado.</div>}
      <label className="form-label">Email</label>
      <input className="form-control mb-3" value={user.email} disabled />
      <label className="form-label">Nombre</label>
      <input className="form-control mb-3" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-primary">Guardar cambios</button>
    </form>
  )
}
