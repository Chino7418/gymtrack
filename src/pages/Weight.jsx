import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { supabase } from '../lib/supabaseClient'
import { T, C } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function Weight() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [value, setValue] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [error, setError] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from(T.weights).select('*').order(C.weightDate)
    if (error) setError(error.message); else setRows(data)
  }
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault(); setError('')
    const n = Number(value)
    if (!(n > 0)) return setError('Ingresá un peso mayor a 0')
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
    datasets: [{ label: 'Peso (kg)', data: rows.map((r) => r[C.weightValue]), borderColor: '#0d6efd', tension: 0.25 }],
  }
  return (
    <>
      <h1 className="h4 mb-3">Peso corporal</h1>
      <ErrorMsg error={error} />
      <form onSubmit={add} className="row g-2 mb-4">
        <div className="col-6 col-md-3"><input type="number" step="0.1" min="0" className="form-control" placeholder="Peso (kg)" value={value} onChange={(e) => setValue(e.target.value)} /></div>
        <div className="col-6 col-md-3"><input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="col-12 col-md-2"><button className="btn btn-primary w-100">Registrar</button></div>
      </form>
      {rows.length === 0 ? <p className="text-muted">Todavía no registraste tu peso.</p> : (
        <>
          <div className="mb-4"><Line data={data} options={{ responsive: true }} /></div>
          <ul className="list-group">
            {[...rows].reverse().map((r) => (
              <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{dayjs(r[C.weightDate]).format('DD/MM/YYYY')} — <strong>{r[C.weightValue]} kg</strong></span>
                <button className="btn btn-sm btn-outline-danger" onClick={() => del(r.id)}>Borrar</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
