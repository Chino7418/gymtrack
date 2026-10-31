import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg, ThemeToggle } from '../components/Layout'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [f, setF] = useState({ first_name: '', last_name: '', username: '', birth_date: '' })
  const [weight, setWeight] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    Promise.all([
      supabase.from(T.profiles).select('*').eq('id', user.id).maybeSingle(),
      supabase.from(T.weights).select('*').order(C.weightDate, { ascending: false }).limit(1),
    ]).then(([p, w]) => {
      const err = p.error || w.error
      if (err) setError(err.message)
      const d = p.data
      if (d) setF({
        first_name: d.first_name ?? '', last_name: d.last_name ?? '', username: d.username ?? '',
        birth_date: d.birth_date ?? '',
      })
      setWeight(w.data?.[0] ? Number(w.data[0][C.weightValue]) : null)
      setLoading(false)
    })
  }, [user.id])

  const save = async (e) => {
    e.preventDefault(); setError(''); setOk(false)
    if (!f.first_name.trim() || !f.last_name.trim() || !f.username.trim()) return setError('Nombre, apellido y usuario son obligatorios')
    if (f.birth_date && dayjs(f.birth_date).isAfter(dayjs(), 'day')) return setError('La fecha de nacimiento no puede ser futura')
    const { error } = await supabase.from(T.profiles).update({
      first_name: f.first_name.trim(), last_name: f.last_name.trim(), username: f.username.trim(),
      birth_date: f.birth_date || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (error) setError(error.code === '23505' ? 'Ese nombre de usuario ya está en uso' : error.message)
    else setOk(true)
  }

  if (loading) return <p>Cargando…</p>

  const edad = f.birth_date ? dayjs().diff(dayjs(f.birth_date), 'year') : null
  const peso = weight

  return (
    <>
      <h1 className="h4 mb-3">Perfil</h1>
      <ErrorMsg error={error} />
      {ok && <div role="status" className="alert alert-success py-2">Perfil guardado.</div>}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <form onSubmit={save} className="card card-body">
            <label className="form-label" htmlFor="pf-email">Email</label>
            <input id="pf-email" className="form-control mb-2" value={user.email} readOnly />
            <div className="row g-2">
              <div className="col-6"><label className="form-label" htmlFor="pf-first">Nombre</label><input id="pf-first" autoComplete="given-name" className="form-control mb-2" value={f.first_name} onChange={set('first_name')} /></div>
              <div className="col-6"><label className="form-label" htmlFor="pf-last">Apellido</label><input id="pf-last" autoComplete="family-name" className="form-control mb-2" value={f.last_name} onChange={set('last_name')} /></div>
            </div>
            <label className="form-label" htmlFor="pf-user">Usuario</label>
            <input id="pf-user" autoComplete="username" className="form-control mb-2" autoCapitalize="none" value={f.username} onChange={set('username')} />
            <div className="row g-2">
              <div className="col-12 col-sm-6"><label className="form-label" htmlFor="pf-birth">Fecha de nacimiento</label><input id="pf-birth" autoComplete="bday" type="date" max={dayjs().format('YYYY-MM-DD')} className="form-control mb-2" value={f.birth_date} onChange={set('birth_date')} /></div>
            </div>
            <button className="btn btn-primary mt-2">Guardar cambios</button>
          </form>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card card-body h-100">
            <h2 className="h6 text-muted mb-3">Tu resumen</h2>
            <div className="row g-3 text-center">
              <div className="col-6"><div className="fs-3 fw-bold">{edad ?? '—'}</div><div className="small text-muted">Edad (años)</div></div>
              <div className="col-6"><div className="fs-3 fw-bold">{peso ?? '—'}</div><div className="small text-muted">Peso actual (kg)</div></div>
            </div>
            <p className="small text-muted mt-3 mb-0">
              El IMC y el objetivo se cargan desde la pantalla de Mis Datos.
            </p>
          </div>
        </div>

        <div className="col-12">
          <section className="card" aria-labelledby="ajustes">
            <div className="card-body p-3">
              <h2 id="ajustes" className="h6 text-muted mb-2">Ajustes</h2>
              <div className="settings">
                <div className="settings-row">
                  <span className="me-auto">Tema</span><ThemeToggle />
                </div>
                <button type="button" className="settings-row text-danger-emphasis" onClick={signOut}>
                  <LogOut size={20} aria-hidden="true" /><span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
