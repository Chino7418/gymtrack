import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { PRESETS, fmt, useRestTimer } from '../lib/useRestTimer'

// Barra compacta para usar el descanso sin salir del formulario de entrenamiento.
// Expone restart(segundos) para que el formulario arranque el descanso al marcar una serie.
// Con onlyWhenActive se oculta sola mientras el descanso no está corriendo ni en pausa
// (así el Layout la puede mostrar en cualquier pantalla sin ocupar lugar de más).
const RestTimerBar = forwardRef(function RestTimerBar({ onlyWhenActive = false } = {}, ref) {
  const timer = useRestTimer()
  const latest = useRef(timer)
  latest.current = timer
  useImperativeHandle(ref, () => ({
    restart: (seconds) => latest.current.restart(seconds),
  }), [])

  const { total, left, running, paused, state, caption, announce, once } = timer
  if (onlyWhenActive && !running && !paused) return null
  return (
    <div className={`rest-bar rest-${state} mb-3`} role="group" aria-label="Temporizador de descanso">
      <Timer size={18} aria-hidden="true" />
      <span className="rest-bar-time" role="timer" aria-label={`Descanso restante: ${fmt(left)}`}>{fmt(left)}</span>
      <span className="rest-bar-caption">{caption}</span>
      <span className="visually-hidden" role="status">{announce}</span>
      <div className="rest-bar-actions">
        {running
          ? <button type="button" className="btn btn-sm btn-warning" onClick={once(timer.pause)} aria-label="Pausar descanso"><Pause size={16} aria-hidden="true" /></button>
          : <button type="button" className="btn btn-sm btn-primary" onClick={once(timer.start)} aria-label={paused ? 'Seguir descanso' : 'Iniciar descanso'}><Play size={16} aria-hidden="true" /></button>}
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={timer.plus} aria-label="+15 segundos">+15</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={timer.reset} aria-label="Reiniciar descanso"><RotateCcw size={16} aria-hidden="true" /></button>
        <select className="form-select form-select-sm rest-bar-preset" aria-label="Duración del descanso" value={total} onChange={(e) => timer.choose(Number(e.target.value))}>
          {!PRESETS.includes(total) && <option value={total}>{fmt(total)}</option>}
          {PRESETS.map((s) => <option key={s} value={s}>{s % 60 ? `${s}s` : `${s / 60}m`}</option>)}
        </select>
      </div>
    </div>
  )
})

export default RestTimerBar
