import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

export default function Exercises() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState({ id: null, name: '', group: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data, error } = await supabase.from(T.exercises).select('*').order(C.exerciseName)
    if (error) setError(error.message); else setList(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setError('')
    if (!form.name.trim()) return setError('El nombre es obligatorio')
    const row = { [C.exerciseName]: form.name.trim(), [C.exerciseGroup]: form.group.trim() || null }
    const q = form.id
      ? supabase.from(T.exercises).update(row).eq('id', form.id)
      : supabase.from(T.exercises).insert({ ...row, user_id: user.id })
    const { error } = await q
    if (error) return setError(error.message)
    setForm({ id: null, name: '', group: '' }); load()
  }
  const del = async (id) => {
    if (!confirm('¿Borrar este ejercicio?')) return
    const { error } = await supabase.from(T.exercises).delete().eq('id', id)
    if (error) setError(error.message); else load()
  }

  return (
    <>
      <h1 className="h4 mb-3">Ejercicios</h1>
      <ErrorMsg error={error} />
      <form onSubmit={save} className="row g-2 mb-4">
        <div className="col-12 col-md-5"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="col-12 col-md-4"><input className="form-control" placeholder="Grupo muscular (opcional)" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} /></div>
        <div className="col-12 col-md-3 d-flex gap-2">
          <button className="btn btn-primary flex-grow-1">{form.id ? 'Guardar cambios' : 'Agregar'}</button>
          {form.id && <button type="button" className="btn btn-outline-secondary" onClick={() => setForm({ id: null, name: '', group: '' })}>Cancelar</button>}
        </div>
      </form>
      {loading ? <p>Cargando…</p> : list.length === 0 ? <p className="text-muted">Todavía no cargaste ejercicios.</p> : (
        <ul className="list-group">
          {list.map((x) => (
            <li key={x.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>{x[C.exerciseName]} {x[C.exerciseGroup] && <small className="text-muted ms-2">{x[C.exerciseGroup]}</small>}</span>
              <span className="btn-group btn-group-sm">
                <button className="btn btn-outline-primary" onClick={() => setForm({ id: x.id, name: x[C.exerciseName], group: x[C.exerciseGroup] ?? '' })}>Editar</button>
                <button className="btn btn-outline-danger" onClick={() => del(x.id)}>Borrar</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
