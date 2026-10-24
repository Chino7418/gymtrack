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
  const [saving, setSaving] = useState(null)

  const load = async () => {
    const { data, error } = await supabase.from(T.attendances).select('*')
      .gte('attendance_date', month.format('YYYY-MM-DD'))
      .lte('attendance_date', month.endOf('month').format('YYYY-MM-DD'))
    if (error) setError(error.message); else setRows(data)
  }
  useEffect(() => { load() }, [month])

  const toggle = async (date) => {
    if (saving) return
    setError(''); setSaving(date)
    const found = rows.find((r) => r.attendance_date === date)
    const { error } = found
      ? await supabase.from(T.attendances).delete().eq('id', found.id)
      : await supabase.from(T.attendances).insert({ user_id: user.id, attendance_date: date })
    if (error) setError(error.message); else await load()
    setSaving(null)
  }

  const offset = (month.day() + 6) % 7 // semana desde lunes
  const cells = [...Array(offset).fill(null), ...Array.from({ length: month.daysInMonth() }, (_, i) => month.date(i + 1).format('YYYY-MM-DD'))]
  const attended = new Set(rows.map((r) => r.attendance_date))

  return (
    <>
      <h1 className="h4 mb-3">Asistencia</h1>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="Mes anterior">‹ Anterior</button>
        <h2 className="h5 m-0 text-capitalize" aria-live="polite">{month.format('MMMM YYYY')}</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => setMonth(month.add(1, 'month'))} aria-label="Mes siguiente">Siguiente ›</button>
      </div>
      <ErrorMsg error={error} />
      <div className="att-grid">
        {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map((d) => (
          <abbr key={d} title={d} className="text-muted small text-center text-decoration-none">{d[0].toUpperCase()}</abbr>
        ))}
        {cells.map((d, i) => d ? (
          <button key={d} onClick={() => toggle(d)} disabled={saving === d}
            aria-pressed={attended.has(d)} aria-label={dayjs(d).format('dddd D [de] MMMM')}
            className={`btn att-day ${attended.has(d) ? 'att-on' : ''} ${d === dayjs().format('YYYY-MM-DD') ? 'att-today' : ''}`}>
            {dayjs(d).date()}
            {attended.has(d) && <span className="att-check" aria-hidden="true">✓</span>}
          </button>
        ) : <div key={`e${i}`} />)}
      </div>
      <p className="mt-3">Días asistidos este mes: <strong>{attended.size}</strong></p>
      <p className="text-muted small">Tocá un día para marcarlo o desmarcarlo.</p>
    </>
  )
}
