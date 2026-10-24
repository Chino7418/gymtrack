import { describe, it, expect } from 'vitest'
import { weightTrend } from './progress'

describe('weightTrend', () => {
  it('devuelve null si falta el registro actual o el anterior', () => {
    expect(weightTrend(null, 80, 75)).toBeNull()
    expect(weightTrend(80, null, 75)).toBeNull()
  })

  it('da premio al bajar si el objetivo es bajar', () => {
    const t = weightTrend(79.4, 80, 75)
    expect(t.kind).toBe('award')
    expect(t.text).toBe('−0.6 kg')
  })

  it('da premio al subir si el objetivo es subir (ganar masa)', () => {
    const t = weightTrend(70.5, 70, 75)
    expect(t.kind).toBe('award')
    expect(t.text).toBe('+0.5 kg')
  })

  it('marca "away" si el cambio aleja del objetivo', () => {
    expect(weightTrend(80.4, 80, 75).kind).toBe('away')
  })

  it('celebra el objetivo alcanzado aunque el cambio sea chico', () => {
    const t = weightTrend(75, 75.3, 75)
    expect(t.kind).toBe('goal')
    expect(t.text).toBe('¡Objetivo!')
  })

  it('sin cambios menores a 50 g', () => {
    expect(weightTrend(80.02, 80, 75).kind).toBe('same')
  })

  it('sin objetivo muestra solo la dirección', () => {
    expect(weightTrend(79, 80, null).kind).toBe('down')
    expect(weightTrend(81, 80, null).kind).toBe('up')
  })

  it('el texto accesible describe el cambio en palabras', () => {
    expect(weightTrend(79.4, 80, 75).label).toBe('Bajaste 0.6 kg: estás más cerca de tu objetivo')
  })
})
