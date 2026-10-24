import { useEffect, useState } from 'react'
import { CATEGORIAS, ejerciciosPorCategoria } from '../lib/wger'
import { ErrorMsg } from './Layout'
import { grupoLabel } from '../lib/muscles'

export const norm = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const MIOS = 'mine'

// Buscador de ejercicios: "Mis ejercicios" (opcional) + categorías del catálogo wger.
// onPick recibe el ejercicio propio o el item del catálogo (sin id de nuestra tabla).
export default function ExercisePicker({ mine, onPick, includeMine = false, markAdded = false }) {
  const [cat, setCat] = useState(includeMine ? MIOS : null)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(null)
  const [open, setOpen] = useState(null)
  const [onlyImg, setOnlyImg] = useState(false)
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

  const [lastAdded, setLastAdded] = useState('')
  const pick = async (x) => { setPicking(x.id); const ok = await onPick(x); setPicking(null); if (ok !== false) setLastAdded(x.name) }
  const added = new Set(mine.map((x) => norm(x.name)))
  const source = cat === MIOS ? mine.filter((x) => x.is_active !== false) : items
  const shown = source.filter((x) => norm(x.name).includes(norm(q)) && (!onlyImg || x.thumb))
  const chip = (id, label) => (
    <button key={id} type="button" className={`btn btn-sm chip ${cat === id ? 'active' : ''}`} aria-pressed={cat === id} onClick={() => setCat(id)}>{label}</button>
  )

  return (
    <div className="card card-body p-3 mb-3">
      <div className="d-flex flex-wrap gap-2 mb-2" role="group" aria-label="Categorías">
        {includeMine && chip(MIOS, 'Mis ejercicios')}
        {CATEGORIAS.map((c) => chip(c.id, c.label))}
      </div>
      <ErrorMsg error={error} />
      {lastAdded && <p className="small text-success-emphasis mb-2" role="status">Agregado: {lastAdded}. Podés seguir sumando ejercicios.</p>}
      {cat == null ? <p className="text-muted small mb-0">Elegí una categoría para ver ejercicios.</p> : busy ? <p className="mb-0" role="status">Cargando…</p> : (
        <>
          <input type="search" className="form-control mb-2" placeholder="Filtrar por nombre…" aria-label="Filtrar ejercicios por nombre" value={q} onChange={(e) => setQ(e.target.value)} />
          {cat !== MIOS && (
            <div className="form-check form-switch mb-2">
              <input id="onlyImg" type="checkbox" className="form-check-input" checked={onlyImg} onChange={(e) => setOnlyImg(e.target.checked)} />
              <label htmlFor="onlyImg" className="form-check-label small">Solo con imagen</label>
            </div>
          )}
          {shown.length === 0 ? (
            <p className="text-muted small mb-0">{cat === MIOS && !q ? 'Todavía no tenés ejercicios: elegí una categoría del catálogo.' : 'Sin resultados.'}</p>
          ) : (
            <ul className="list-group catalog-list">
              {shown.map((x) => (
                <li key={x.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <button type="button" className="ex-row min-w-0" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
                      {x.thumb
                        ? <img src={x.thumb} alt="" className="ex-thumb" loading="lazy" />
                        : <span className="ex-thumb ex-thumb-empty">{x.name[0]}</span>}
                      <span className="min-w-0">
                        <span className="d-block text-truncate" lang={x.spanish === false ? 'en' : undefined}>{x.name}{x.spanish === false && <small className="text-muted ms-1">(EN)</small>}</span>
                        <small className="text-muted d-block text-truncate">{grupoLabel(x.muscle_group)}{x.equipment && ` · ${x.equipment}`}</small>
                      </span>
                    </button>
                    {markAdded && added.has(norm(x.name))
                      ? <span className="badge text-bg-success">Agregado</span>
                      : <button type="button" className="btn btn-sm btn-outline-primary text-nowrap" disabled={picking === x.id} onClick={() => pick(x)} aria-label={`Agregar ${x.name}`}>+ Agregar</button>}
                  </div>
                  {open === x.id && (
                    <div className="ex-detail mt-2">
                      {x.image && <img src={x.image} alt={x.name} className="ex-image" />}
                      <p className="small text-muted mb-0">{x.description || 'Sin descripción.'}</p>
                    </div>
                  )}
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
