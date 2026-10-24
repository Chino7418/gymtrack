import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import ExercisePicker, { norm } from '../components/ExercisePicker'
import ConfirmButton from '../components/ConfirmButton'
import { GRUPOS, grupoLabel } from '../lib/muscles'
import TrainingTabs from '../components/TrainingTabs'

const VACIO = { id: null, name: '', muscle_group: '', description: '' }

export default function Exercises() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState(VACIO)
  const [mode, setMode] = useState(null) // null | 'catalog' | 'manual'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data, error } = await supabase.from(T.exercises).select('*').order('name')
    if (error) setError(error.message); else setList(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setError('')
    if (!form.name.trim()) return setError('El nombre es obligatorio')
    if (!form.muscle_group) return setError('Elegí un grupo muscular')
    if (list.some((x) => x.id !== form.id && norm(x.name) === norm(form.name)))
      return setError('Ya tenés un ejercicio con ese nombre')
    const row = { name: form.name.trim(), muscle_group: form.muscle_group, description: form.description.trim() || null }
    const { error } = form.id
      ? await supabase.from(T.exercises).update({ ...row, updated_at: new Date().toISOString() }).eq('id', form.id)
      : await supabase.from(T.exercises).insert({ ...row, user_id: user.id })
    if (error) return setError(error.message)
    setForm(VACIO); setMode(null); load()
  }
  const importar = async (x) => {
    setError('')
    const { error } = await supabase.from(T.exercises)
      .insert({ name: x.name, muscle_group: x.muscle_group, description: x.description, user_id: user.id })
    if (error) { setError(error.message); return false }
    load()
  }
  const del = async (id) => {
    const { error } = await supabase.from(T.exercises).delete().eq('id', id)
    if (error) setError(error.code === '23503' ? 'No se puede borrar: el ejercicio se usa en algún entrenamiento' : error.message)
    else load()
  }
  const edit = (x) => { setForm({ id: x.id, name: x.name, muscle_group: x.muscle_group, description: x.description ?? '' }); setMode('manual') }
  const toggle = (m) => { setForm(VACIO); setMode(mode === m ? null : m) }


  return (
    <>
      <h1 className="h4 mb-3">Entrenos</h1>
      <TrainingTabs />
      <ErrorMsg error={error} />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className={`btn ${mode === 'catalog' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => toggle('catalog')} aria-expanded={mode === 'catalog'}>Buscar en catálogo</button>
        <button className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => toggle('manual')} aria-expanded={mode === 'manual'}>Crear manual</button>
      </div>

      {mode === 'catalog' && <ExercisePicker mine={list} onPick={importar} markAdded />}

      {mode === 'manual' && (
        <form onSubmit={save} className="card card-body p-3 mb-4">
          <div className="row g-2">
            <div className="col-12 col-md-4"><label className="form-label" htmlFor="ex-name">Nombre</label><input id="ex-name" className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="ex-group">Grupo muscular</label>
              <select id="ex-group" className="form-select" required value={form.muscle_group} onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}>
                <option value="">Elegir…</option>
                {GRUPOS.map((g) => <option key={g} value={g}>{grupoLabel(g)}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-5"><label className="form-label" htmlFor="ex-desc">Descripción <span className="text-muted small">(opcional)</span></label><input id="ex-desc" className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary">{form.id ? 'Guardar cambios' : 'Agregar ejercicio'}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => toggle('manual')}>Cancelar</button>
            </div>
          </div>
        </form>
      )}

      <h2 className="h6 stat-label mb-2">Mis ejercicios ({list.length})</h2>
      {loading ? <p role="status">Cargando…</p> : list.length === 0 ? <p className="text-muted">Todavía no cargaste ejercicios.</p> : (
        <ul className="list-group">
          {list.map((x) => (
            <li key={x.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
              <span className="min-w-0 text-truncate">{x.name} <small className="text-muted ms-2">{grupoLabel(x.muscle_group)}</small></span>
              <span className="d-flex gap-2 flex-none">
                <button className="btn btn-sm btn-outline-primary" onClick={() => edit(x)} aria-label={`Editar ${x.name}`}>Editar</button>
                <ConfirmButton what={x.name} onConfirm={() => del(x.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
