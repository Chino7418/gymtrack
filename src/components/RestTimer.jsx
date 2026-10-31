import { Timer, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { PRESETS, fmt, useRestTimer } from '../lib/useRestTimer'

const R = 52
const LEN = 2 * Math.PI * R

const preset = (s) => (s % 60 ? `${s} segundos` : `${s / 60} minuto${s > 60 ? 's' : ''}`)

export default function RestTimer() {
  const {
    total, left, running, paused, sound,
    toggleSound, start, pause, reset, choose, plus, once,
    frac, state, caption, announce,
  } = useRestTimer({ syncTitle: true })

  return (
    <div className={`card h-100 timer timer-${state}`}>
      <div className="card-body p-3">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <h2 className="stat-label stat-ic mb-0"><Timer size={14} aria-hidden="true" />Descanso entre series</h2>
          <button type="button" className="btn btn-sm btn-outline-secondary timer-sound" onClick={toggleSound} aria-pressed={sound}
            aria-label={sound ? 'Sonido activado' : 'Sonido desactivado'} title={sound ? 'Silenciar el aviso' : 'Activar el aviso sonoro'}>
            {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          </button>
        </div>
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
                ? <button className="btn btn-warning flex-grow-1 gap-2" onClick={once(pause)}><Pause size={18} aria-hidden="true" />Pausar</button>
                : <button className="btn btn-primary flex-grow-1 gap-2" onClick={once(start)}><Play size={18} aria-hidden="true" />{paused ? 'Seguir' : 'Iniciar'}</button>}
              <button className="btn btn-outline-secondary" onClick={plus} aria-label="+15 segundos">+15</button>
              <button className="btn btn-outline-secondary" onClick={reset} aria-label="Reiniciar">
                <RotateCcw size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="d-flex flex-wrap gap-2" role="group" aria-label="Duración del descanso">
              {PRESETS.map((s) => (
                <button key={s} className={`btn btn-sm timer-preset ${total === s ? 'active' : ''}`} aria-pressed={total === s} aria-label={`${s % 60 ? `${s}s` : `${s / 60}m`}, ${preset(s)}`} onClick={() => choose(s)}>
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
