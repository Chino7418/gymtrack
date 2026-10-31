import { useEffect, useRef, useState } from 'react'
import { beep, unlockAudio } from './beep'

export const PRESETS = [30, 60, 90, 120, 180]
const KEY = 'gymtrack.restTimer'
const SOUND_KEY = 'unamas.timerSound'

export const fmt = (s) => {
  const n = Math.max(0, Math.ceil(s))
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true } }

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

// Estado compartido por el temporizador de Inicio y la barra del formulario.
// El estado vive en localStorage para que el descanso siga corriendo al cambiar de pantalla.
export function useRestTimer({ syncTitle = false } = {}) {
  const [init] = useState(restore)
  const [total, setTotal] = useState(init.total)
  const [left, setLeft] = useState(init.left)
  const [running, setRunning] = useState(init.running)
  const [done, setDone] = useState(init.done)
  const [endAt, setEndAt] = useState(init.endAt)
  const [sound, setSound] = useState(soundOn)
  // Pausa explícita: con +15 el restante puede superar la duración elegida y no alcanza con comparar números
  const [paused, setPaused] = useState(init.paused ?? (!init.running && !init.done && init.left > 0 && init.left < init.total))

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off') } catch { /* sin storage */ }
    if (next) { unlockAudio(); beep() } // prueba del sonido al activarlo
  }

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ total, left, running, done, endAt, paused })) } catch { /* sin storage */ }
  }, [total, running, done, endAt, paused, running ? 0 : left])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const rem = (endAt - Date.now()) / 1000
      if (rem <= 0) {
        clearInterval(id)
        setLeft(0); setRunning(false); setDone(true); setPaused(false)
        navigator.vibrate?.([300, 150, 300, 150, 300])
        if (soundOn()) beep()
      } else setLeft(rem)
    }, 200)
    return () => clearInterval(id)
  }, [running, endAt])

  useEffect(() => {
    if (!syncTitle) return
    document.title = running ? `${fmt(left)} · Una Más` : 'Una Más'
    return () => { document.title = 'Una Más' }
  }, [syncTitle, running, left])

  // Ignora el segundo toque de un doble clic: el botón cambia de Iniciar a Pausar bajo el dedo
  const lastTap = useRef(0)
  const once = (fn) => () => { const now = Date.now(); if (now - lastTap.current < 400) return; lastTap.current = now; fn() }

  const run = (secs) => { unlockAudio(); setDone(false); setPaused(false); setLeft(secs); setEndAt(Date.now() + secs * 1000); setRunning(true) }
  const start = () => run(done || left <= 0 ? total : left)
  const restart = (secs = total) => { setTotal(secs); run(secs) }
  const pause = () => { setRunning(false); setPaused(true) }
  const reset = () => { setRunning(false); setDone(false); setPaused(false); setLeft(total) }
  const choose = (s) => { setTotal(s); setLeft(s); setRunning(false); setDone(false); setPaused(false) }
  // En reposo +15 alarga la duración elegida; corriendo o en pausa, el descanso actual
  const plus = () => {
    if (done) return restart(15)
    if (running) setEndAt(endAt + 15000)
    else if (!paused) setTotal(total + 15)
    setLeft(left + 15)
  }

  // El anillo se vacía a medida que pasa el descanso
  const frac = left > 0 ? Math.min(1, left / Math.max(total, left)) : 0
  const state = done ? 'done' : running ? 'run' : 'idle'
  const caption = done ? '¡A la serie!' : running ? 'descansando' : paused ? 'en pausa' : 'listo'
  // Solo se anuncian los cambios de estado, no cada segundo
  const announce = done ? 'Descanso terminado. ¡A la próxima serie!' : running ? 'Descanso iniciado' : paused ? 'Descanso en pausa' : ''

  return {
    total, left, running, done, paused, sound,
    toggleSound, start, restart, pause, reset, choose, plus, once,
    frac, state, caption, announce,
  }
}
