import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import ConfirmButton from '../components/ConfirmButton'
import { ChevronDown, ChevronUp, Ruler } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
const chartColors = () => ({ text: css('--bs-secondary-color'), grid: css('--bs-border-color'), line: css('--bs-primary') })

// Medidas corporales que se registran desde la pantalla de Peso
const MEDICIONES = [
  { key: 'brazo', label: 'Brazo' },
  { key: 'piernas', label: 'Piernas' },
  { key: 'cadera', label: 'Cadera' },
  { key: 'cintura', label: 'Cintura' },
  { key: 'cuello', label: 'Cuello' },
]

const categoria = (imc) => (imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad')

export default function Weight() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [value, setValue] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [height, setHeight] = useState('')
  const [error, setError] = useState('')
  const [colors, setColors] = useState(chartColors)
  const [meas, setMeas] = useState({ measured_date: dayjs().format('YYYY-MM-DD'), brazo: '', piernas: '', cadera: '', cintura: '', cuello: '' })
  const [measRows, setMeasRows] = useState([])
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
  useEffect(() => {
    supabase.from(T.profiles).select('height_cm').eq('id', user.id).maybeSingle().then(({ data }) => setHeight(data?.height_cm != null ? String(data.height_cm) : ''))
  }, [user.id])

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
    const h = height.trim() === '' ? null : Number(height)
    if (h != null && !(h > 0 && h < 300)) return setError('La altura tiene que ser mayor a 0 y menor a 300 cm')
    const { error: errW } = await supabase.from(T.weights).insert({ user_id: user.id, [C.weightValue]: n, [C.weightDate]: date })
    if (errW) return setError(errW.message)
    if (h != null) await supabase.from(T.profiles).update({ height_cm: h, updated_at: new Date().toISOString() }).eq('id', user.id)
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

  const loadMeas = async () => {
    const { data, error } = await supabase.from(T.bodyMeasurements).select('*').order(C.measurementDate, { ascending: true })
    if (error) setError(error.message); else setMeasRows(data)
  }
  useEffect(() => { loadMeas() }, [])
  const saveMeas = async (e) => {
    e.preventDefault(); setError('')
    const filled = MEDICIONES.filter((m) => meas[m.key].trim() !== '')
    if (filled.length === 0) return setError('Ingresá al menos una medida')
    const entradas = filled.map((m) => ({ user_id: user.id, [C.measurementDate]: meas.measured_date, measurement: m.key, [C.measurementValue]: Number(meas[m.key]) }))
    for (const en of entradas) {
      if (!(en[C.measurementValue] > 0 && en[C.measurementValue] < 500)) return setError('Las medidas tienen que estar entre 0 y 500 cm')
    }
    const { error: errM } = await supabase.from(T.bodyMeasurements).insert(entradas)
    if (errM) return setError(errM.message)
    setMeas({ measured_date: dayjs().format('YYYY-MM-DD'), brazo: '', piernas: '', cadera: '', cintura: '', cuello: '' })
    loadMeas()
  }

  const ultima = rows.length ? rows[rows.length - 1] : null
  const pesoActual = ultima ? Number(ultima[C.weightValue]) : null
  const alturaNum = height.trim() === '' ? null : Number(height)
  const imc = pesoActual && alturaNum ? pesoActual / Math.pow(alturaNum / 100, 2) : null

  // Comparativa: cada medida contra el valor de la entrada anterior del mismo tipo
  const comparativas = MEDICIONES.map((m) => {
    const entries = measRows.filter((r) => r.measurement === m.key)
    const ultimaM = entries[entries.length - 1]
    const anterior = entries[entries.length - 2]
    const valor = ultimaM ? Number(ultimaM[C.measurementValue]) : null
    const antes = anterior ? Number(anterior[C.measurementValue]) : null
    const delta = valor != null && antes != null ? valor - antes : null
    return { ...m, valor, antes, delta }
  }).filter((m) => m.valor != null)

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
        <div className="col-6 col-md-3"><label className="form-label" htmlFor="w-height">Altura (cm)</label><input id="w-height" type="number" inputMode="decimal" step="any" min="0" className="form-control" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
        <div className="col-12 col-md-3 d-flex align-items-end"><button className="btn btn-primary w-100">Registrar</button></div>
      </form>
      <div className="alert alert-info py-2 mb-4" role="status">
        {imc ? <>IMC: <b>{imc.toFixed(1)}</b> · {categoria(imc)}</> : 'Cargá tu altura y registrá tu peso para ver tu IMC.'}
      </div>
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

      <section className="card card-body p-3 mt-4" aria-labelledby="medidas-title">
        <h2 id="medidas-title" className="h6 text-muted mb-3 d-flex align-items-center gap-2"><Ruler size={18} aria-hidden="true" />Medidas del cuerpo</h2>
        <form onSubmit={saveMeas} className="row g-2 mb-3">
          <div className="col-6 col-md-2"><label className="form-label" htmlFor="m-date">Fecha</label><input id="m-date" type="date" max={dayjs().format('YYYY-MM-DD')} className="form-control" value={meas.measured_date} onChange={(e) => setMeas({ ...meas, measured_date: e.target.value })} required /></div>
          {MEDICIONES.map((m) => (
            <div className="col-6 col-md-2" key={m.key}>
              <label className="form-label" htmlFor={`m-${m.key}`}>{m.label} (cm)</label>
              <input id={`m-${m.key}`} type="number" inputMode="decimal" step="any" min="0" className="form-control" value={meas[m.key]} onChange={(e) => setMeas({ ...meas, [m.key]: e.target.value })} />
            </div>
          ))}
          <div className="col-12 col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Guardar</button></div>
        </form>
        {comparativas.length === 0 ? <p className="text-muted mb-0">Todavía no registraste medidas.</p> : (
          <ul className="list-group">
            {comparativas.map((m) => (
              <li key={m.key} className="list-group-item px-0">
                <div className="d-flex justify-content-between align-items-baseline">
                  <span className="me-auto">{m.label}</span>
                  <span className="fw-bold">{m.valor} cm</span>
                </div>
                <small className="text-muted">{m.delta != null ? `${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta).toFixed(1)} cm vs. ${m.antes} cm` : 'Sin comparativa'}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
