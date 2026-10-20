import { useEffect, useRef, useState } from 'react'

const PRESETS = [30, 60, 90, 120, 180]

function alarm(ctx) {
  const t0 = ctx.currentTime
  for (let i = 0; i < 6; i++) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = i % 2 ? 988 : 880
    o.connect(g)
    g.connect(ctx.destination)
    const s = t0 + i * 0.35
    g.gain.setValueAtTime(0.0001, s)
    g.gain.exponentialRampToValueAtTime(0.4, s + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.3)
    o.start(s)
    o.stop(s + 0.32)
  }
}

const fmt = (s) => {
  const n = Math.max(0, Math.ceil(s))
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

export default function RestTimer() {
  const [total, setTotal] = useState(90)
  const [left, setLeft] = useState(90)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [muted, setMuted] = useState(false)
  const endRef = useRef(0)
  const ctxRef = useRef(null)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) ctxRef.current = new AC()
    }
    ctxRef.current?.resume?.()
    return ctxRef.current
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const rem = (endRef.current - Date.now()) / 1000
      if (rem <= 0) {
        clearInterval(id)
        setLeft(0); setRunning(false); setDone(true)
        if (!mutedRef.current && ctxRef.current) alarm(ctxRef.current)
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
    getCtx() // el navegador exige un clic del usuario para habilitar el sonido
    const from = done || left <= 0 ? total : left
    setDone(false); setLeft(from)
    endRef.current = Date.now() + from * 1000
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const reset = () => { setRunning(false); setDone(false); setLeft(total) }
  const choose = (s) => { setTotal(s); setLeft(s); setRunning(false); setDone(false) }
  const testSound = () => { const c = getCtx(); if (c) alarm(c) }

  const pct = total > 0 ? Math.min(100, ((total - left) / total) * 100) : 0

  return (
    <div className="card h-100">
      <div className="card-body text-center">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h6 text-muted m-0">Descanso entre series</h2>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setMuted(!muted)}>
            {muted ? 'Sonido: apagado' : 'Sonido: activo'}
          </button>
        </div>
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
          <button className="btn btn-outline-primary" onClick={testSound}>Probar sonido</button>
        </div>
      </div>
    </div>
  )
}
