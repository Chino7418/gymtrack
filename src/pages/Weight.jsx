import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import ConfirmButton from '../components/ConfirmButton'
import { ChevronDown, ChevronUp } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

// Colores del gráfico tomados del tema activo (se recalculan al cambiar de tema)
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
const chartColors = () => ({ text: css('--bs-secondary-color'), grid: css('--bs-border-color'), line: css('--bs-primary') })

export default function Weight() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [value, setValue] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [error, setError] = useState('')
  const [colors, setColors] = useState(chartColors)
  useEffect(() => {
    const on = () => setColors(chartColors())
    window.addEventListener('themechange', on)
    return () => window.removeEventListener('themechange', on)
  }, [])

  const load = async () => {
    const { data, error } = await supabase.from(T.weights).select('*').order(C.weightDate)
    if (error) setError(error.message); else setRows(data)
  }
  useEffect(() => { load() }, [])

  const invalid = (v, d) => {
    const n = Number(v)
    if (!(n >= 20 && n <= 400)) return 'Ingresá un peso entre 20 y 400 kg'
    if (!d) return 'Elegí la fecha'
    if (dayjs(d).isAfter(dayjs(), 'day')) return 'La fecha no puede ser futura'
    return ''
  }
  const add = async (e) => {
    e.preventDefault(); setError('')
    const msg = invalid(value, date)
    if (msg) return setError(msg)
    const n = Number(value)
    const { error } = await supabase.from(T.weights).insert({ user_id: user.id, [C.weightValue]: n, [C.weightDate]: date })
    if (error) return setError(error.message)
    setValue(''); load()
  }
  const del = async (id) => {
    const { error } = await supabase.from(T.weights).delete().eq('id', id)
    if (error) setError(error.message); else { setOpenId(null); load() }
  }

  // Cada registro es un renglón que se despliega para editar fecha, peso y nota
  const [openId, setOpenId] = useState(null)
  const [edit, setEdit] = useState(null)
  const openRow = (r) => {
    if (openId === r.id) { setOpenId(null); return }
    setOpenId(r.id)
    setEdit({ value: String(r[C.weightValue]), date: r[C.weightDate], notes: r.notes ?? '' })
  }
  const saveEdit = async (e, id) => {
    e.preventDefault(); setError('')
    const msg = invalid(edit.value, edit.date)
    if (msg) return setError(msg)
    const { error } = await supabase.from(T.weights)
      .update({ [C.weightValue]: Number(edit.value), [C.weightDate]: edit.date, notes: edit.notes.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return setError(error.message)
    setOpenId(null); load()
  }

  const data = {
    labels: rows.map((r) => dayjs(r[C.weightDate]).format('DD/MM')),
    datasets: [{ label: 'Peso (kg)', data: rows.map((r) => r[C.weightValue]), borderColor: colors.line, backgroundColor: colors.line, tension: 0.25 }],
  }
  const axis = { ticks: { color: colors.text }, grid: { color: colors.grid } }
  const options = { responsive: true, plugins: { legend: { labels: { color: colors.text } } }, scales: { x: axis, y: axis } }
  return (
    <>
      <h1 className="h4 mb-3">Peso corporal</h1>
      <ErrorMsg error={error} />
      <form onSubmit={add} className="row g-2 mb-4">
        <div className="col-6 col-md-3"><label className="form-label" htmlFor="w-value">Peso (kg)</label><input id="w-value" type="number" inputMode="decimal" step="any" min="0" className="form-control" value={value} onChange={(e) => setValue(e.target.value)} /></div>
        <div className="col-6 col-md-3"><label className="form-label" htmlFor="w-date">Fecha</label><input id="w-date" type="date" max={dayjs().format('YYYY-MM-DD')} className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="col-12 col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Registrar</button></div>
      </form>
      {rows.length === 0 ? <p className="text-muted">Todavía no registraste tu peso.</p> : (
        <>
          <div className="mb-4"><Line data={data} options={options} role="img" aria-label="Gráfico de evolución del peso; el detalle está en la lista de abajo" /></div>
          <ul className="list-group">
            {[...rows].reverse().map((r) => {
              const isOpen = openId === r.id
              return (
                <li key={r.id} className="list-group-item p-0">
                  <button type="button" className="acc-head" onClick={() => openRow(r)} aria-expanded={isOpen} aria-controls={`w-${r.id}`}>
                    <span className="min-w-0">
                      <span className="acc-title">{r[C.weightValue]} kg</span>
                      <span className="acc-sub">{dayjs(r[C.weightDate]).format('ddd DD/MM/YYYY')}{r.notes ? ` · ${r.notes}` : ''}</span>
                    </span>
                    {isOpen ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
                  </button>
                  {isOpen && (
                    <form id={`w-${r.id}`} className="acc-body acc-anim row g-2 px-3 pb-3" onSubmit={(e) => saveEdit(e, r.id)} noValidate>
                      <div className="col-6"><label className="form-label" htmlFor={`we-v-${r.id}`}>Peso (kg)</label>
                        <input id={`we-v-${r.id}`} type="number" inputMode="decimal" step="any" className="form-control" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} /></div>
                      <div className="col-6"><label className="form-label" htmlFor={`we-d-${r.id}`}>Fecha</label>
                        <input id={`we-d-${r.id}`} type="date" max={dayjs().format('YYYY-MM-DD')} className="form-control" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></div>
                      <div className="col-12"><label className="form-label" htmlFor={`we-n-${r.id}`}>Nota <span className="text-muted small">(opcional)</span></label>
                        <input id={`we-n-${r.id}`} className="form-control" placeholder="Ej.: en ayunas" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
                      <div className="col-12 d-flex flex-wrap gap-2">
                        <button className="btn btn-primary">Guardar</button>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setOpenId(null)}>Cancelar</button>
                        <span className="ms-auto"><ConfirmButton what={`el registro del ${dayjs(r[C.weightDate]).format('DD/MM')}`} onConfirm={() => del(r.id)} /></span>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
