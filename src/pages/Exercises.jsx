import { useEffect, useState } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { uploadExerciseImage, removeExerciseImage, insertExercise } from '../lib/images'
import PhotoField from '../components/PhotoField'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import ExercisePicker, { norm } from '../components/ExercisePicker'
import ConfirmButton from '../components/ConfirmButton'
import { GRUPOS, grupoLabel } from '../lib/muscles'
import TrainingTabs from '../components/TrainingTabs'

const VACIO = { id: null, name: '', muscle_group: '', description: '', image_url: null, image_public_id: null }

// Si todavía no se aplicó la migración de image_public_id, reintenta sin esa columna
async function updateExercise(id, payload) {
  const res = await supabase.from(T.exercises).update(payload).eq('id', id)
  if (!res.error || !res.error.message.includes('image_public_id')) return res
  const { image_public_id, ...rest } = payload // eslint-disable-line no-unused-vars
  return supabase.from(T.exercises).update(rest).eq('id', id)
}

function ExerciseList({ items, archived = false, onEdit, onDelete, onToggleArchive }) {
  return (
    <ul className="list-group">
      {items.map((x) => (
        <li key={x.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
          <span className="d-flex align-items-center gap-2 min-w-0">
            {x.image_url
              ? <img src={x.image_url} alt="" className="ex-thumb" loading="lazy" />
              : <span className="ex-thumb ex-thumb-empty" aria-hidden="true">{x.name[0]}</span>}
            <span className="min-w-0"><span className="d-block line-2">{x.name}</span><small className="text-muted">{grupoLabel(x.muscle_group)}</small></span>
          </span>
          <span className="d-flex gap-2 flex-none">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEdit(x)} aria-label={`Editar ${x.name}`}>Editar</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onToggleArchive(x)}
              aria-label={archived ? `Reactivar ${x.name}` : `Archivar ${x.name}`} title={archived ? 'Reactivar' : 'Archivar'}>
              {archived ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
            </button>
            <ConfirmButton what={x.name} onConfirm={() => onDelete(x.id)} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function Exercises() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [form, setForm] = useState(VACIO)
  const [mode, setMode] = useState(null) // null | 'catalog' | 'manual'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Foto elegida (todavía sin subir) y su vista previa
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])
  const pickFile = (f) => { setFile(f); setPreview(URL.createObjectURL(f)) }
  const clearPhoto = () => { setFile(null); setPreview(null); setForm({ ...form, image_url: null, image_public_id: null }) }

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
    setSaving(true)
    let subida = null
    try {
      const before = list.find((x) => x.id === form.id) ?? null
      const up = file ? await uploadExerciseImage(file, user.id) : { url: form.image_url, publicId: form.image_public_id }
      subida = file ? up : null
      const row = { name: form.name.trim(), muscle_group: form.muscle_group, description: form.description.trim() || null }
      if (file || up.url !== (before?.image_url ?? null)) { row.image_url = up.url; row.image_public_id = up.publicId }
      const { error } = form.id
        ? await updateExercise(form.id, { ...row, updated_at: new Date().toISOString() })
        : await insertExercise({ ...row, user_id: user.id })
      if (error) throw new Error(/image_url/.test(error.message) ? 'Falta aplicar la migración de imágenes en Supabase' : error.message)
      // La foto anterior propia se borra del almacenamiento si se reemplazó o se quitó
      if (before?.image_url && before.image_url !== up.url) removeExerciseImage(before.image_url, before.image_public_id)
      setForm(VACIO); setFile(null); setPreview(null); setMode(null); load()
    } catch (err) {
      // Si la subida salió bien pero no se pudo guardar, no dejamos la foto huérfana
      if (subida?.publicId) removeExerciseImage(subida.url, subida.publicId)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  const importar = async (x) => {
    setError('')
    const { error } = await insertExercise({ name: x.name, muscle_group: x.muscle_group, description: x.description, image_url: x.image ?? null, user_id: user.id })
    if (error) { setError(error.message); return false }
    load()
  }
  const del = async (id) => {
    const ex = list.find((x) => x.id === id)
    const { error } = await supabase.from(T.exercises).delete().eq('id', id)
    if (error) setError(error.code === '23503' ? 'No se puede borrar: el ejercicio se usa en algún entrenamiento. Archivalo para ocultarlo del buscador.' : error.message)
    else { if (ex?.image_url) removeExerciseImage(ex.image_url, ex.image_public_id); load() }
  }
  const toggleArchive = async (x) => {
    setError('')
    const { error } = await supabase.from(T.exercises)
      .update({ is_active: x.is_active === false, updated_at: new Date().toISOString() })
      .eq('id', x.id)
    if (error) setError(error.message)
    else {
      if (form.id === x.id) { setForm(VACIO); setFile(null); setPreview(null); setMode(null) }
      load()
    }
  }
  const edit = (x) => { setForm({ id: x.id, name: x.name, muscle_group: x.muscle_group, description: x.description ?? '', image_url: x.image_url ?? null, image_public_id: x.image_public_id ?? null }); setFile(null); setPreview(null); setMode('manual') }
  const toggle = (m) => { setForm(VACIO); setFile(null); setPreview(null); setMode(mode === m ? null : m) }
  const shown = preview ?? form.image_url
  const active = list.filter((x) => x.is_active !== false)
  const archived = list.filter((x) => x.is_active === false)

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
            <div className="col-12">
              <span className="form-label d-block">Foto <span className="text-muted small">(opcional)</span></span>
              <PhotoField src={shown} onPick={pickFile} onClear={clearPhoto} onError={setError} />
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agregar ejercicio'}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => toggle('manual')}>Cancelar</button>
            </div>
          </div>
        </form>
      )}

      <h2 className="h6 stat-label mb-2">Mis ejercicios ({active.length})</h2>
      {loading ? <p role="status">Cargando…</p> : active.length === 0 ? <p className="text-muted">Todavía no cargaste ejercicios.</p> : (
        <ExerciseList items={active} onEdit={edit} onDelete={del} onToggleArchive={toggleArchive} />
      )}
      {archived.length > 0 && (
        <div className="mt-3">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowArchived(!showArchived)} aria-expanded={showArchived} aria-controls="archived-exercises">
            {showArchived ? 'Ocultar archivados' : `Ver archivados (${archived.length})`}
          </button>
          {showArchived && (
            <div id="archived-exercises" className="mt-3">
              <h2 className="h6 stat-label mb-2">Archivados</h2>
              <ExerciseList items={archived} archived onEdit={edit} onDelete={del} onToggleArchive={toggleArchive} />
            </div>
          )}
        </div>
      )}
    </>
  )
}
