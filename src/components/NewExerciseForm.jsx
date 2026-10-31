import { useEffect, useState } from 'react'
import { GRUPOS, grupoLabel } from '../lib/muscles'
import { ErrorMsg } from './Layout'
import PhotoField from './PhotoField'

// Formulario corto para crear un ejercicio propio desde el buscador (nombre, grupo y foto opcional).
// onCreate({ name, muscle_group, file }) devuelve un mensaje de error, o nada si salió bien.
export default function NewExerciseForm({ initialName = '', onCreate, onCancel }) {
  const [name, setName] = useState(initialName)
  const [group, setGroup] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pickFile = (f) => { setFile(f); setPreview(URL.createObjectURL(f)) }
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!name.trim()) return setError('Poné un nombre al ejercicio')
    if (!group) return setError('Elegí un grupo muscular')
    setSaving(true)
    const msg = await onCreate({ name: name.trim(), muscle_group: group, file })
    setSaving(false)
    if (msg) setError(msg)
  }

  return (
    <form onSubmit={submit} noValidate className="new-ex" aria-labelledby="new-ex-title">
      <h3 id="new-ex-title" className="h6 fw-bold mb-2">Ejercicio nuevo</h3>
      <ErrorMsg error={error} />
      <label className="form-label" htmlFor="nx-name">Nombre</label>
      <input id="nx-name" className="form-control mb-2" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Remo en máquina Hammer" />
      <label className="form-label" htmlFor="nx-group">Grupo muscular</label>
      <select id="nx-group" className="form-select mb-2" value={group} onChange={(e) => setGroup(e.target.value)}>
        <option value="">Elegir…</option>
        {GRUPOS.map((g) => <option key={g} value={g}>{grupoLabel(g)}</option>)}
      </select>
      <span className="form-label d-block">Foto <span className="text-muted small">(opcional)</span></span>
      <div className="mb-3">
        <PhotoField src={preview} onPick={pickFile} onClear={() => { setFile(null); setPreview(null) }} onError={setError} />
      </div>
      <div className="d-flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear y agregar'}</button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}
