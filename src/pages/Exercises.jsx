import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

const GRUPOS = ['Pecho', 'Espalda', 'Hombros', 'Biceps', 'Triceps', 'Piernas', 'Gluteos', 'Abdomen', 'Otro']
const VACIO = { id: null, name: '', muscle_group: '', description: '' }

export default function Exercises() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState(VACIO)
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
    const row = { name: form.name.trim(), muscle_group: form.muscle_group, description: form.description.trim() || null }
    const { error } = form.id
      ? await supabase.from(T.exercises).update({ ...row, updated_at: new Date().toISOString() }).eq('id', form.id)
      : await supabase.from(T.exercises).insert({ ...row, user_id: user.id })
    if (error) return setError(error.message)
    setForm(VACIO); load()
  }
  const del = async (id) => {
    if (!confirm('¿Borrar este ejercicio?')) return
    const { error } = await supabase.from(T.exercises).delete().eq('id', id)
    if (error) setError(error.code === '23503' ? 'No se puede borrar: el ejercicio se usa en algún entrenamiento' : error.message)
    else load()
  }

  return (
    <>
      <h1 className="h4 mb-3">Ejercicios</h1>
      <ErrorMsg error={error} />
      <form onSubmit={save} className="row g-2 mb-4">
        <div className="col-12 col-md-4"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="col-12 col-md-3">
          <select className="form-select" value={form.muscle_group} onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}>
            <option value="">Grupo muscular…</option>
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-5"><input className="form-control" placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="col-12 d-flex gap-2">
          <button className="btn btn-primary">{form.id ? 'Guardar cambios' : 'Agregar ejercicio'}</button>
          {form.id && <button type="button" className="btn btn-outline-secondary" onClick={() => setForm(VACIO)}>Cancelar</button>}
        </div>
      </form>
      {loading ? <p>Cargando…</p> : list.length === 0 ? <p className="text-muted">Todavía no cargaste ejercicios.</p> : (
        <ul className="list-group">
          {list.map((x) => (
            <li key={x.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>{x.name} <small className="text-muted ms-2">{x.muscle_group}</small></span>
              <span className="btn-group btn-group-sm">
                <button className="btn btn-outline-primary" onClick={() => setForm({ id: x.id, name: x.name, muscle_group: x.muscle_group, description: x.description ?? '' })}>Editar</button>
                <button className="btn btn-outline-danger" onClick={() => del(x.id)}>Borrar</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
