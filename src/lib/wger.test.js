import { describe, it, expect, vi, beforeEach } from 'vitest'

// El caché de wger.js es de módulo: se reimporta en cada test para aislarlos
let ejerciciosPorCategoria, CATEGORIAS
beforeEach(async () => {
  vi.resetModules()
  ;({ ejerciciosPorCategoria, CATEGORIAS } = await import('./wger'))
})

const ES = 4, EN = 2
const ej = (over = {}) => ({
  id: 1,
  category: { id: 11 },
  muscles: [],
  equipment: [],
  images: [],
  translations: [{ language: ES, name: 'Press de banca', description: '<p>Acostate <b>boca arriba</b></p>' }],
  ...over,
})
const mockFetch = (results, ok = true) => {
  const fn = vi.fn().mockResolvedValue({ ok, json: async () => ({ results }) })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('ejerciciosPorCategoria', () => {
  it('pide la categoría correcta a wger', async () => {
    const f = mockFetch([])
    await ejerciciosPorCategoria(12)
    expect(f).toHaveBeenCalledWith('https://wger.de/api/v2/exerciseinfo/?category=12&limit=300')
  })

  it('lanza error si la respuesta no es ok', async () => {
    mockFetch([], false)
    await expect(ejerciciosPorCategoria(11)).rejects.toThrow('No se pudo cargar el catálogo de ejercicios')
  })

  it('devuelve lista vacía si no hay resultados', async () => {
    mockFetch([])
    expect(await ejerciciosPorCategoria(11)).toEqual([])
  })

  it('prefiere la traducción en español', async () => {
    mockFetch([ej({ translations: [{ language: EN, name: 'Bench press' }, { language: ES, name: 'Press banca' }] })])
    const [r] = await ejerciciosPorCategoria(11)
    expect(r.name).toBe('Press banca')
    expect(r.spanish).toBe(true)
  })

  it('usa inglés si no hay español', async () => {
    mockFetch([ej({ translations: [{ language: EN, name: 'Bench press' }] })])
    const [r] = await ejerciciosPorCategoria(11)
    expect(r.name).toBe('Bench press')
    expect(r.spanish).toBe(false)
  })

  it('descarta ejercicios sin español ni inglés', async () => {
    mockFetch([ej({ translations: [{ language: 1, name: 'Bankdrücken' }] })])
    expect(await ejerciciosPorCategoria(11)).toEqual([])
  })

  it('descarta ejercicios con nombre vacío o sin traducciones', async () => {
    mockFetch([
      ej({ id: 1, translations: [{ language: ES, name: '   ' }] }),
      ej({ id: 2, translations: [] }),
    ])
    expect(await ejerciciosPorCategoria(11)).toEqual([])
  })

  it('recorta el nombre y lo limita a 150 caracteres', async () => {
    mockFetch([ej({ translations: [{ language: ES, name: `  ${'a'.repeat(200)}  ` }] })])
    const [r] = await ejerciciosPorCategoria(11)
    expect(r.name).toHaveLength(150)
  })

  it('convierte la descripción HTML a texto plano', async () => {
    mockFetch([ej()])
    const [r] = await ejerciciosPorCategoria(11)
    expect(r.description).toBe('Acostate boca arriba')
  })

  it('deja la descripción en null si falta o queda vacía', async () => {
    mockFetch([
      ej({ id: 1, translations: [{ language: ES, name: 'A' }] }),
      ej({ id: 2, translations: [{ language: ES, name: 'B', description: '<p> </p>' }] }),
    ])
    const r = await ejerciciosPorCategoria(11)
    expect(r.map((x) => x.description)).toEqual([null, null])
  })

  it('elige la imagen principal y sus miniaturas', async () => {
    mockFetch([ej({ images: [
      { image: 'otra.jpg', is_main: false },
      { image: 'main.jpg', is_main: true, thumbnails: { small: 's.jpg', medium: 'm.jpg' } },
    ] })])
    const [r] = await ejerciciosPorCategoria(11)
    expect(r.thumb).toBe('s.jpg')
    expect(r.image).toBe('m.jpg')
  })

  it('usa la primera imagen sin miniaturas, o null si no hay', async () => {
    mockFetch([
      ej({ id: 1, translations: [{ language: ES, name: 'A' }], images: [{ image: 'x.jpg' }] }),
      ej({ id: 2, translations: [{ language: ES, name: 'B' }], images: [] }),
    ])
    const [a, b] = await ejerciciosPorCategoria(11)
    expect(a.thumb).toBe('x.jpg')
    expect(a.image).toBe('x.jpg')
    expect(b.thumb).toBeNull()
    expect(b.image).toBeNull()
  })

  it('une los equipamientos con coma', async () => {
    mockFetch([ej({ equipment: [{ name: 'Barra' }, { name: 'Banco' }] })])
    const [r] = await ejerciciosPorCategoria(11)
    expect(r.equipment).toBe('Barra, Banco')
  })

  it('ordena por nombre en español', async () => {
    mockFetch([
      ej({ id: 1, translations: [{ language: ES, name: 'Zancadas' }] }),
      ej({ id: 2, translations: [{ language: ES, name: 'Ábdominales' }] }),
      ej({ id: 3, translations: [{ language: ES, name: 'Dominadas' }] }),
    ])
    const r = await ejerciciosPorCategoria(11)
    expect(r.map((x) => x.name)).toEqual(['Ábdominales', 'Dominadas', 'Zancadas'])
  })

  it('cachea por categoría y no vuelve a llamar a fetch', async () => {
    const f = mockFetch([ej()])
    const a = await ejerciciosPorCategoria(11)
    const b = await ejerciciosPorCategoria(11)
    expect(b).toBe(a)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('no cachea un fallo: reintenta en la próxima llamada', async () => {
    mockFetch([], false)
    await expect(ejerciciosPorCategoria(11)).rejects.toThrow()
    const f = mockFetch([ej()])
    expect(await ejerciciosPorCategoria(11)).toHaveLength(1)
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('mapeo a muscle_group', () => {
  const grupoDe = async (cat, muscles = []) => {
    mockFetch([ej({ category: { id: cat }, muscles })])
    const [r] = await ejerciciosPorCategoria(cat)
    return r.muscle_group
  }

  it.each([
    [11, 'Pecho'], [12, 'Espalda'], [13, 'Hombros'], [10, 'Abdomen'], [14, 'Piernas'],
  ])('categoría %i → %s', async (cat, esperado) => {
    expect(await grupoDe(cat)).toBe(esperado)
  })

  it('piernas con glúteo mayor (8) → Gluteos', async () => {
    expect(await grupoDe(9, [{ id: 8 }])).toBe('Gluteos')
  })

  it('piernas sin glúteo → Piernas', async () => {
    expect(await grupoDe(9, [{ id: 10 }])).toBe('Piernas')
  })

  it('brazos con tríceps (5) → Triceps', async () => {
    expect(await grupoDe(8, [{ id: 5 }])).toBe('Triceps')
  })

  it.each([[1], [13]])('brazos con el músculo %i → Biceps', async (m) => {
    expect(await grupoDe(8, [{ id: m }])).toBe('Biceps')
  })

  it('brazos sin músculo reconocido → Otro', async () => {
    expect(await grupoDe(8, [])).toBe('Otro')
  })

  it('cardio y categorías desconocidas → Otro', async () => {
    expect(await grupoDe(15)).toBe('Otro')
    expect(await grupoDe(999)).toBe('Otro')
  })
})

describe('CATEGORIAS', () => {
  it('tiene 8 categorías con id único', () => {
    expect(CATEGORIAS).toHaveLength(8)
    expect(new Set(CATEGORIAS.map((c) => c.id)).size).toBe(8)
  })
})
