import { useEffect, useRef, useState } from 'react'

const PRESETS = [30, 60, 90, 120, 180]

const fmt = (s) => {
  const n = Math.max(0, Math.ceil(s))
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

// El estado se guarda en localStorage para que el descanso siga corriendo al cambiar de pantalla
const KEY = 'gymtrack.restTimer'
const restore = () => {
  let s = null
  try { s = JSON.parse(localStorage.getItem(KEY)) } catch { /* sin storage */ }
  if (!s) return { total: 90, left: 90, running: false, done: false, endAt: 0 }
  if (s.running) {
    const rem = (s.endAt - Date.now()) / 1000
    return rem > 0 ? { ...s, left: rem } : { ...s, left: 0, running: false, done: true }
  }
  return s
}

export default function RestTimer() {
  const [init] = useState(restore)
  const [total, setTotal] = useState(init.total)
  const [left, setLeft] = useState(init.left)
  const [running, setRunning] = useState(init.running)
  const [done, setDone] = useState(init.done)
  const endRef = useRef(init.endAt)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ total, left, running, done, endAt: endRef.current })) } catch { /* sin storage */ }
  }, [total, running, done, running ? 0 : left])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const rem = (endRef.current - Date.now()) / 1000
      if (rem <= 0) {
        clearInterval(id)
        setLeft(0); setRunning(false); setDone(true)
        navigator.vibrate?.([300, 150, 300, 150, 300])
      } else setLeft(rem)
    }, 200)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    document.title = running ? `${fmt(left)} · GymTrack` : 'GymTrack'
    return () => { document.title = 'GymTrack' }
  }, [running, left])

  const start = () => {
    const from = done || left <= 0 ? total : left
    setDone(false); setLeft(from)
    endRef.current = Date.now() + from * 1000
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const reset = () => { setRunning(false); setDone(false); setLeft(total) }
  const choose = (s) => { setTotal(s); setLeft(s); setRunning(false); setDone(false) }

  const pct = total > 0 ? Math.min(100, ((total - left) / total) * 100) : 0

  return (
    <div className="card h-100">
      <div className="card-body p-3">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div>
            <div className="stat-label">Descanso entre series</div>
            <div className={`timer-digits ${done ? 'text-danger' : ''}`} aria-live="polite">{fmt(left)}</div>
          </div>
          <div className="d-flex gap-2">
            {running
              ? <button className="btn btn-warning" onClick={pause}>Pausar</button>
              : <button className="btn btn-success" onClick={start}>{left > 0 && left < total && !done ? 'Seguir' : 'Iniciar'}</button>}
            <button className="btn btn-outline-secondary" onClick={reset} aria-label="Reiniciar">↺</button>
          </div>
        </div>
        <div className="progress my-2" style={{ height: 6 }}>
          <div className={`progress-bar ${done ? 'bg-danger' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="d-flex flex-wrap justify-content-center gap-1">
          {PRESETS.map((s) => (
            <button key={s} className={`btn btn-sm ${total === s ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => choose(s)}>
              {s >= 60 ? `${s / 60} min` : `${s} s`}
            </button>
          ))}
        </div>
        {done && <div className="alert alert-danger py-1 mt-2 mb-0 text-center">¡Descanso terminado! A la próxima serie.</div>}
      </div>
    </div>
  )
}
