import { useEffect, useState } from 'react'
import { Timer, Pause, Play, RotateCcw } from 'lucide-react'

const PRESETS = [30, 60, 90, 120, 180]
const R = 52
const LEN = 2 * Math.PI * R

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
  const [endAt, setEndAt] = useState(init.endAt)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ total, left, running, done, endAt })) } catch { /* sin storage */ }
  }, [total, running, done, endAt, running ? 0 : left])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const rem = (endAt - Date.now()) / 1000
      if (rem <= 0) {
        clearInterval(id)
        setLeft(0); setRunning(false); setDone(true)
        navigator.vibrate?.([300, 150, 300, 150, 300])
      } else setLeft(rem)
    }, 200)
    return () => clearInterval(id)
  }, [running, endAt])

  useEffect(() => {
    document.title = running ? `${fmt(left)} · Una Más` : 'Una Más'
    return () => { document.title = 'Una Más' }
  }, [running, left])

  const run = (secs) => { setDone(false); setLeft(secs); setEndAt(Date.now() + secs * 1000); setRunning(true) }
  const start = () => run(done || left <= 0 ? total : left)
  const pause = () => setRunning(false)
  const reset = () => { setRunning(false); setDone(false); setLeft(total) }
  const choose = (s) => { setTotal(s); setLeft(s); setRunning(false); setDone(false) }
  const plus = () => {
    if (done) return run(15)
    if (running) setEndAt(endAt + 15000)
    setLeft(left + 15)
  }

  // El anillo se vacía a medida que pasa el descanso
  const frac = left > 0 ? Math.min(1, left / Math.max(total, left)) : 0
  const state = done ? 'done' : running ? 'run' : 'idle'
  const caption = done ? '¡A la serie!' : running ? 'descansando' : left < total ? 'en pausa' : 'listo'
  // Solo se anuncian los cambios de estado, no cada segundo
  const announce = done ? 'Descanso terminado. ¡A la próxima serie!' : running ? 'Descanso iniciado' : left < total ? 'Descanso en pausa' : ''
  const preset = (s) => (s % 60 ? `${s} segundos` : `${s / 60} minuto${s > 60 ? 's' : ''}`)

  return (
    <div className={`card h-100 timer timer-${state}`}>
      <div className="card-body p-3">
        <h2 className="stat-label stat-ic mb-2"><Timer size={14} aria-hidden="true" />Descanso entre series</h2>
        <span className="visually-hidden" role="status">{announce}</span>
        <div className="timer-body">
          <div className="timer-ring" role="timer" aria-label={`Descanso restante: ${fmt(left)}`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r={R} className="timer-track" />
              <circle cx="60" cy="60" r={R} className="timer-arc" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - frac)} />
            </svg>
            <div className="timer-center">
              <div className="timer-digits">{fmt(left)}</div>
              <div className="timer-caption">{caption}</div>
            </div>
          </div>
          <div className="timer-controls">
            <div className="d-flex gap-2">
              {running
                ? <button className="btn btn-warning flex-grow-1 gap-2" onClick={pause}><Pause size={18} aria-hidden="true" />Pausar</button>
                : <button className="btn btn-primary flex-grow-1 gap-2" onClick={start}><Play size={18} aria-hidden="true" />{left > 0 && left < total && !done ? 'Seguir' : 'Iniciar'}</button>}
              <button className="btn btn-outline-secondary" onClick={plus} aria-label="+15 segundos">+15</button>
              <button className="btn btn-outline-secondary" onClick={reset} aria-label="Reiniciar">
                <RotateCcw size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="d-flex flex-wrap gap-2" role="group" aria-label="Duración del descanso">
              {PRESETS.map((s) => (
                <button key={s} className={`btn btn-sm timer-preset ${total === s ? 'active' : ''}`} aria-pressed={total === s} aria-label={preset(s)} onClick={() => choose(s)}>
                  {s % 60 ? `${s}s` : `${s / 60}m`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
