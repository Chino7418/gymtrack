import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

const categoria = (imc) => (imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad')

export default function Profile() {
  const { user } = useAuth()
  const [f, setF] = useState({ first_name: '', last_name: '', username: '', birth_date: '', height_cm: '', goal_weight_kg: '' })
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
        birth_date: d.birth_date ?? '', height_cm: d.height_cm ?? '', goal_weight_kg: d.goal_weight_kg ?? '',
      })
      setWeight(w.data?.[0] ? Number(w.data[0][C.weightValue]) : null)
      setLoading(false)
    })
  }, [user.id])

  const save = async (e) => {
    e.preventDefault(); setError(''); setOk(false)
    if (!f.first_name.trim() || !f.last_name.trim() || !f.username.trim()) return setError('Nombre, apellido y usuario son obligatorios')
    if (f.height_cm !== '' && (Number(f.height_cm) <= 0 || Number(f.height_cm) >= 300)) return setError('La altura debe estar entre 1 y 299 cm')
    if (f.goal_weight_kg !== '' && (Number(f.goal_weight_kg) <= 0 || Number(f.goal_weight_kg) >= 500)) return setError('El objetivo debe estar entre 1 y 499 kg')
    const { error } = await supabase.from(T.profiles).update({
      first_name: f.first_name.trim(), last_name: f.last_name.trim(), username: f.username.trim(),
      birth_date: f.birth_date || null,
      height_cm: f.height_cm === '' ? null : Number(f.height_cm),
      goal_weight_kg: f.goal_weight_kg === '' ? null : Number(f.goal_weight_kg),
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (error) setError(error.code === '23505' ? 'Ese nombre de usuario ya está en uso' : error.message)
    else setOk(true)
  }

  if (loading) return <p>Cargando…</p>

  const edad = f.birth_date ? dayjs().diff(dayjs(f.birth_date), 'year') : null
  const altura = f.height_cm !== '' ? Number(f.height_cm) : null
  const imc = weight && altura ? weight / Math.pow(altura / 100, 2) : null
  const objetivo = f.goal_weight_kg !== '' ? Number(f.goal_weight_kg) : null

  return (
    <>
      <h1 className="h4 mb-3">Perfil</h1>
      <ErrorMsg error={error} />
      {ok && <div className="alert alert-success py-2">Perfil guardado.</div>}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <form onSubmit={save} className="card card-body">
            <label className="form-label">Email</label>
            <input className="form-control mb-2" value={user.email} disabled />
            <div className="row g-2">
              <div className="col-6"><label className="form-label">Nombre</label><input className="form-control mb-2" value={f.first_name} onChange={set('first_name')} /></div>
              <div className="col-6"><label className="form-label">Apellido</label><input className="form-control mb-2" value={f.last_name} onChange={set('last_name')} /></div>
            </div>
            <label className="form-label">Usuario</label>
            <input className="form-control mb-2" autoCapitalize="none" value={f.username} onChange={set('username')} />
            <div className="row g-2">
              <div className="col-12 col-sm-6"><label className="form-label">Fecha de nacimiento</label><input type="date" className="form-control mb-2" value={f.birth_date} onChange={set('birth_date')} /></div>
              <div className="col-6 col-sm-3"><label className="form-label">Altura (cm)</label><input type="number" step="0.1" min="0" className="form-control mb-2" value={f.height_cm} onChange={set('height_cm')} /></div>
              <div className="col-6 col-sm-3"><label className="form-label">Objetivo (kg)</label><input type="number" step="0.1" min="0" className="form-control mb-2" value={f.goal_weight_kg} onChange={set('goal_weight_kg')} /></div>
            </div>
            <button className="btn btn-primary mt-2">Guardar cambios</button>
          </form>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card card-body h-100">
            <h2 className="h6 text-muted mb-3">Tu resumen</h2>
            <div className="row g-3 text-center">
              <div className="col-6"><div className="fs-3 fw-bold">{edad ?? '—'}</div><div className="small text-muted">Edad (años)</div></div>
              <div className="col-6"><div className="fs-3 fw-bold">{altura ?? '—'}</div><div className="small text-muted">Altura (cm)</div></div>
              <div className="col-6"><div className="fs-3 fw-bold">{weight ?? '—'}</div><div className="small text-muted">Peso actual (kg)</div></div>
              <div className="col-6"><div className="fs-3 fw-bold">{objetivo ?? '—'}</div><div className="small text-muted">Objetivo (kg)</div></div>
              <div className="col-12">
                <div className="fs-3 fw-bold">{imc ? imc.toFixed(1) : '—'}</div>
                <div className="small text-muted">IMC{imc ? ` · ${categoria(imc)}` : ''}</div>
              </div>
            </div>
            <p className="small text-muted mt-3 mb-0">
              {imc ? 'El IMC es una referencia general: no distingue masa muscular de grasa y no es un diagnóstico.'
                : 'Cargá tu altura y registrá tu peso para ver tu IMC.'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
