// Aviso sonoro del temporizador con Web Audio (sin archivos de audio).
// Los navegadores móviles solo permiten sonar después de un toque: unlockAudio() se llama al tocar Iniciar.
let ctx = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* sin audio */ }
}

// Tres pitidos cortos y agudos, fáciles de oír con música de fondo
export function beep() {
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const start = t0 + i * 0.28
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = i === 2 ? 1320 : 880
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.2)
    }
  } catch { /* sin audio */ }
}
