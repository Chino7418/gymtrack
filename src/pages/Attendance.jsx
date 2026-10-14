import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'
import { T } from '../lib/schema'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

export default function Attendance() {
  const { user } = useAuth()
  const [month, setMonth] = useState(dayjs().startOf('month'))
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from(T.attendances).select('*')
      .gte('attendance_date', month.format('YYYY-MM-DD'))
      .lte('attendance_date', month.endOf('month').format('YYYY-MM-DD'))
    if (error) setError(error.message); else setRows(data)
  }
  useEffect(() => { load() }, [month])

  const toggle = async (date) => {
    setError('')
    const found = rows.find((r) => r.attendance_date === date)
    const { error } = found
      ? await supabase.from(T.attendances).delete().eq('id', found.id)
      : await supabase.from(T.attendances).insert({ user_id: user.id, attendance_date: date })
    if (error) setError(error.message); else load()
  }

  const offset = (month.day() + 6) % 7 // semana desde lunes
  const cells = [...Array(offset).fill(null), ...Array.from({ length: month.daysInMonth() }, (_, i) => month.date(i + 1).format('YYYY-MM-DD'))]
  const attended = new Set(rows.map((r) => r.attendance_date))

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => setMonth(month.subtract(1, 'month'))}>Anterior</button>
        <h1 className="h5 m-0 text-capitalize">{month.format('MMMM YYYY')}</h1>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => setMonth(month.add(1, 'month'))}>Siguiente</button>
      </div>
      <ErrorMsg error={error} />
      <div className="d-grid text-center gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', maxWidth: 480 }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <div key={d} className="text-muted small">{d}</div>)}
        {cells.map((d, i) => d ? (
          <button key={d} onClick={() => toggle(d)}
            className={`btn btn-sm ${attended.has(d) ? 'btn-success' : 'btn-outline-secondary'}`}>
            {dayjs(d).date()}
          </button>
        ) : <div key={`e${i}`} />)}
      </div>
      <p className="mt-3">Días asistidos este mes: <strong>{attended.size}</strong></p>
      <p className="text-muted small">Tocá un día para marcarlo o desmarcarlo.</p>
    </>
  )
}
