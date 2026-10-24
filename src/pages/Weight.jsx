import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import ConfirmButton from '../components/ConfirmButton'

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

  const add = async (e) => {
    e.preventDefault(); setError('')
    const n = Number(value)
    if (!(n >= 20 && n <= 400)) return setError('Ingresá un peso entre 20 y 400 kg')
    if (dayjs(date).isAfter(dayjs(), 'day')) return setError('La fecha no puede ser futura')
    const { error } = await supabase.from(T.weights).insert({ user_id: user.id, [C.weightValue]: n, [C.weightDate]: date })
    if (error) return setError(error.message)
    setValue(''); load()
  }
  const del = async (id) => {
    const { error } = await supabase.from(T.weights).delete().eq('id', id)
    if (error) setError(error.message); else load()
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
            {[...rows].reverse().map((r) => (
              <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                <span>{dayjs(r[C.weightDate]).format('DD/MM/YYYY')} · <strong>{r[C.weightValue]} kg</strong></span>
                <ConfirmButton what={`el registro del ${dayjs(r[C.weightDate]).format('DD/MM')}`} onConfirm={() => del(r.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
