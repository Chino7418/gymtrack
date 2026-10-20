import { useEffect, useRef, useState } from 'react'

const PRESETS = [30, 60, 90, 120, 180]

const fmt = (s) => {
  const n = Math.max(0, Math.ceil(s))
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

export default function RestTimer() {
  const [total, setTotal] = useState(90)
  const [left, setLeft] = useState(90)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const endRef = useRef(0)

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
      <div className="card-body text-center">
        <h2 className="h6 text-muted mb-2 text-start">Descanso entre series</h2>
        <div className={`display-3 fw-bold ${done ? 'text-danger' : ''}`} aria-live="polite">{fmt(left)}</div>
        {done && <div className="alert alert-danger py-1 my-2">¡Descanso terminado! A la próxima serie.</div>}
        <div className="progress my-3" style={{ height: 8 }}>
          <div className={`progress-bar ${done ? 'bg-danger' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="d-flex flex-wrap justify-content-center gap-1 mb-3">
          {PRESETS.map((s) => (
            <button key={s} className={`btn btn-sm ${total === s ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => choose(s)}>
              {s >= 60 ? `${s / 60} min` : `${s} s`}
            </button>
          ))}
        </div>
        <div className="d-flex justify-content-center gap-2">
          {running
            ? <button className="btn btn-warning" onClick={pause}>Pausar</button>
            : <button className="btn btn-success" onClick={start}>{left > 0 && left < total && !done ? 'Continuar' : 'Iniciar'}</button>}
          <button className="btn btn-outline-secondary" onClick={reset}>Reiniciar</button>
        </div>
      </div>
    </div>
  )
}
