import { useEffect, useState } from 'react'
import { CATEGORIAS, ejerciciosPorCategoria } from '../lib/wger'
import { ErrorMsg } from './Layout'

export const norm = (s) => s.trim().toLowerCase()
const MIOS = 'mine'

// Buscador de ejercicios: "Mis ejercicios" (opcional) + categorías del catálogo wger.
// onPick recibe el ejercicio propio o el item del catálogo (sin id de nuestra tabla).
export default function ExercisePicker({ mine, onPick, includeMine = false, markAdded = false }) {
  const [cat, setCat] = useState(includeMine ? MIOS : null)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cat == null || cat === MIOS) return
    let alive = true
    setBusy(true); setError('')
    ejerciciosPorCategoria(cat)
      .then((r) => alive && setItems(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setBusy(false))
    return () => { alive = false }
  }, [cat])

  const pick = async (x) => { setPicking(x.id); await onPick(x); setPicking(null) }
  const added = new Set(mine.map((x) => norm(x.name)))
  const source = cat === MIOS ? mine.filter((x) => x.is_active !== false) : items
  const shown = source.filter((x) => norm(x.name).includes(norm(q)))
  const chip = (id, label) => (
    <button key={id} type="button" className={`btn btn-sm ${cat === id ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCat(id)}>{label}</button>
  )

  return (
    <div className="card card-body p-3 mb-3">
      <div className="d-flex flex-wrap gap-1 mb-2">
        {includeMine && chip(MIOS, 'Mis ejercicios')}
        {CATEGORIAS.map((c) => chip(c.id, c.label))}
      </div>
      <ErrorMsg error={error} />
      {cat == null ? <p className="text-muted small mb-0">Elegí una categoría para ver ejercicios.</p> : busy ? <p className="mb-0">Cargando…</p> : (
        <>
          <input className="form-control mb-2" placeholder="Filtrar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
          {shown.length === 0 ? (
            <p className="text-muted small mb-0">{cat === MIOS && !q ? 'Todavía no tenés ejercicios: elegí una categoría del catálogo.' : 'Sin resultados.'}</p>
          ) : (
            <ul className="list-group catalog-list">
              {shown.map((x) => (
                <li key={x.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                  <span className="min-w-0">
                    <span className="d-block text-truncate">{x.name}{x.spanish === false && <small className="text-muted ms-1">(EN)</small>}</span>
                    <small className="text-muted">{x.muscle_group}{x.equipment && ` · ${x.equipment}`}</small>
                  </span>
                  {markAdded && added.has(norm(x.name))
                    ? <span className="badge text-bg-success">Agregado</span>
                    : <button type="button" className="btn btn-sm btn-outline-primary text-nowrap" disabled={picking === x.id} onClick={() => pick(x)}>+ Agregar</button>}
                </li>
              ))}
            </ul>
          )}
          {cat !== MIOS && <small className="text-muted d-block mt-2">Catálogo de <a href="https://wger.de" target="_blank" rel="noreferrer">wger.de</a></small>}
        </>
      )}
    </div>
  )
}
