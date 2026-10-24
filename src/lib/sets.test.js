import { describe as suite, it, expect } from 'vitest'
import { buildSets, quickError, quickIssue, summarize, describe, MAX_SERIES } from './sets'

const pesos = (sets) => sets.map((s) => s.weight_kg)

suite('buildSets', () => {
  it('arma una pirámide con el peso subiendo parejo', () => {
    const sets = buildSets({ series: '4', reps: '10', min: '30', max: '45' })
    expect(pesos(sets)).toEqual([30, 35, 40, 45])
    expect(sets.every((s) => s.reps === 10 && s.notes === '')).toBe(true)
  })

  it('usa el mínimo en todas las series si no hay máximo', () => {
    expect(pesos(buildSets({ series: '3', reps: '8', min: '40', max: '' }))).toEqual([40, 40, 40])
    expect(pesos(buildSets({ series: 3, reps: 8, min: 40 }))).toEqual([40, 40, 40])
  })

  it('con una sola serie usa el mínimo aunque haya máximo', () => {
    expect(pesos(buildSets({ series: '1', reps: '5', min: '20', max: '50' }))).toEqual([20])
  })

  it('redondea los pesos a 0,5 kg', () => {
    expect(pesos(buildSets({ series: '4', reps: '10', min: '30', max: '40' }))).toEqual([30, 33.5, 36.5, 40])
  })

  it('con máximo igual al mínimo todas las series pesan lo mismo', () => {
    expect(pesos(buildSets({ series: '3', reps: '10', min: '25', max: '25' }))).toEqual([25, 25, 25])
  })

  it('acepta peso 0', () => {
    expect(pesos(buildSets({ series: '2', reps: '10', min: '0', max: '' }))).toEqual([0, 0])
  })

  it('devuelve lista vacía con 0 series', () => {
    expect(buildSets({ series: '0', reps: '10', min: '20' })).toEqual([])
  })

  it('permite pirámide descendente', () => {
    expect(pesos(buildSets({ series: '3', reps: '10', min: '40', max: '30' }))).toEqual([40, 35, 30])
  })
})

suite('quickError', () => {
  const ok = { series: '4', reps: '10', min: '30', max: '45' }
  const msgSeries = 'las series tienen que ser un número entre 1 y 20'
  const msgReps = 'las repeticiones tienen que ser un número entero desde 1'

  it('devuelve vacío si todo es válido', () => {
    expect(quickError(ok)).toBe('')
  })

  it('acepta 1 y 20 series', () => {
    expect(quickError({ ...ok, series: '1' })).toBe('')
    expect(quickError({ ...ok, series: String(MAX_SERIES) })).toBe('')
  })

  it('rechaza 0, 21 y negativas con el mensaje de series', () => {
    expect(quickError({ ...ok, series: '0' })).toBe(msgSeries)
    expect(quickError({ ...ok, series: '21' })).toBe(msgSeries)
    expect(quickError({ ...ok, series: '-3' })).toBe(msgSeries)
  })

  it('rechaza series no enteras, vacías o no numéricas', () => {
    expect(quickError({ ...ok, series: '2.5' })).toBe(msgSeries)
    expect(quickError({ ...ok, series: '' })).toBe(msgSeries)
    expect(quickError({ ...ok, series: 'abc' })).toBe(msgSeries)
    expect(quickError({ ...ok, series: null })).toBe(msgSeries)
  })

  it('rechaza repeticiones no enteras, cero o vacías', () => {
    expect(quickError({ ...ok, reps: '8.5' })).toBe(msgReps)
    expect(quickError({ ...ok, reps: '0' })).toBe(msgReps)
    expect(quickError({ ...ok, reps: '' })).toBe(msgReps)
  })

  it('acepta peso 0 como válido', () => {
    expect(quickError({ ...ok, min: '0', max: '' })).toBe('')
  })

  it('rechaza peso mínimo vacío o indefinido', () => {
    const msg = 'falta el peso (0 si es sin peso)'
    expect(quickError({ ...ok, min: '' })).toBe(msg)
    expect(quickError({ ...ok, min: undefined })).toBe(msg)
  })

  it('rechaza peso mínimo negativo con un mensaje propio', () => {
    expect(quickError({ ...ok, min: '-1' })).toBe('el peso no puede ser negativo')
  })

  it('rechaza un máximo menor que el mínimo', () => {
    expect(quickError({ ...ok, min: '40', max: '30' })).toBe('el peso máximo no puede ser menor que el mínimo')
  })

  it('acepta máximo vacío o igual al mínimo', () => {
    expect(quickError({ ...ok, max: '' })).toBe('')
    expect(quickError({ ...ok, min: '30', max: '30' })).toBe('')
  })
})

suite('summarize', () => {
  it('es la inversa de buildSets (pirámide)', () => {
    const q = { series: '4', reps: '10', min: '30', max: '45' }
    expect(summarize(buildSets(q))).toEqual(q)
  })

  it('es la inversa de buildSets (solo mínimo)', () => {
    const q = { series: '3', reps: '8', min: '40', max: '' }
    expect(summarize(buildSets(q))).toEqual(q)
  })

  it('es la inversa de buildSets con redondeo a 0,5', () => {
    const q = { series: '4', reps: '10', min: '30', max: '40' }
    expect(summarize(buildSets(q))).toEqual(q)
  })

  it('resume una sola serie', () => {
    expect(summarize([{ weight_kg: 20, reps: 5, notes: '' }])).toEqual({ series: '1', reps: '5', min: '20', max: '' })
  })

  it('devuelve null con lista vacía, null o undefined', () => {
    expect(summarize([])).toBeNull()
    expect(summarize(null)).toBeNull()
    expect(summarize(undefined)).toBeNull()
  })

  it('devuelve null si las repeticiones son distintas', () => {
    expect(summarize([{ weight_kg: 40, reps: 10, notes: '' }, { weight_kg: 40, reps: 8, notes: '' }])).toBeNull()
  })

  it('devuelve null si alguna serie tiene nota', () => {
    expect(summarize([{ weight_kg: 40, reps: 10, notes: '' }, { weight_kg: 40, reps: 10, notes: 'costó' }])).toBeNull()
  })

  it('devuelve null si los pesos no siguen la pirámide', () => {
    const sets = [30, 50, 35, 45].map((w) => ({ weight_kg: w, reps: 10, notes: '' }))
    expect(summarize(sets)).toBeNull()
  })

  it('acepta valores numéricos como strings (como vienen de la base)', () => {
    const sets = [{ weight_kg: '30.00', reps: '10', notes: null }, { weight_kg: '35.00', reps: '10', notes: null }]
    expect(summarize(sets)).toEqual({ series: '2', reps: '10', min: '30', max: '35' })
  })
})

suite('describe', () => {
  it('describe una pirámide como 4×10 · 30→45 kg', () => {
    expect(describe(buildSets({ series: '4', reps: '10', min: '30', max: '45' }))).toBe('4×10 · 30→45 kg')
  })

  it('describe pesos iguales sin flecha', () => {
    expect(describe(buildSets({ series: '3', reps: '8', min: '40', max: '' }))).toBe('3×8 · 40 kg')
  })

  it('lista serie por serie si no hay resumen posible', () => {
    const sets = [{ weight_kg: 40, reps: 10, notes: '' }, { weight_kg: 45, reps: 8, notes: '' }]
    expect(describe(sets)).toBe('40×10 · 45×8')
  })

  it('devuelve texto vacío con lista vacía', () => {
    expect(describe([])).toBe('')
  })
})

suite('casos de la revisión de código', () => {
  it('buildSets no redondea el peso si no hay pirámide (discos de 1,25)', () => {
    expect(pesos(buildSets({ series: '4', reps: '10', min: '21.25', max: '' }))).toEqual([21.25, 21.25, 21.25, 21.25])
  })
  it('buildSets con máximo igual al mínimo tampoco redondea', () => {
    expect(pesos(buildSets({ series: '3', reps: '8', min: '21.25', max: '21.25' }))).toEqual([21.25, 21.25, 21.25])
  })
  it('buildSets con pirámide de 3 series reparte el salto parejo', () => {
    expect(pesos(buildSets({ series: '3', reps: '8', min: '30', max: '45' }))).toEqual([30, 37.5, 45])
  })
  it('summarize devuelve null si una serie tiene peso o reps vacíos', () => {
    expect(summarize([{ weight_kg: '', reps: '', notes: '' }])).toBeNull()
    expect(summarize([{ weight_kg: 40, reps: 10, notes: '' }, { weight_kg: '', reps: 10, notes: '' }])).toBeNull()
  })
})

suite('quickIssue', () => {
  const ok = { series: '4', reps: '10', min: '30', max: '45' }
  it('devuelve null si la carga rápida es válida', () => {
    expect(quickIssue(ok)).toBeNull()
  })
  it('señala el campo con problema', () => {
    expect(quickIssue({ ...ok, series: '0' }).field).toBe('series')
    expect(quickIssue({ ...ok, reps: '8.5' }).field).toBe('reps')
    expect(quickIssue({ ...ok, min: '' }).field).toBe('min')
    expect(quickIssue({ ...ok, min: '-5' }).field).toBe('min')
    expect(quickIssue({ ...ok, max: '20' }).field).toBe('max')
  })
  it('informa el primer problema en orden: series, reps, peso', () => {
    expect(quickIssue({ series: '', reps: '', min: '', max: '' }).field).toBe('series')
  })
})
