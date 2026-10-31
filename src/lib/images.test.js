import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: cada insert consume la próxima respuesta de la cola
const respuestas = []
const inserts = []
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: (row) => { inserts.push(row); return { select: () => ({ single: async () => respuestas.shift() }) } },
    }),
  },
}))

const { insertExercise, removeExerciseImage } = await import('./images')

beforeEach(() => { respuestas.length = 0; inserts.length = 0 })

describe('insertExercise', () => {
  it('inserta con image_url cuando la columna existe', async () => {
    respuestas.push({ data: { id: 1 }, error: null })
    const res = await insertExercise({ name: 'Remo', image_url: 'https://x/y.png' })
    expect(res.data.id).toBe(1)
    expect(inserts).toHaveLength(1)
  })

  it('si falta la columna image_url (migración sin aplicar), reintenta sin ella', async () => {
    respuestas.push({ data: null, error: { message: "Could not find the 'image_url' column of 'exercises'" } })
    respuestas.push({ data: { id: 2 }, error: null })
    const res = await insertExercise({ name: 'Remo', image_url: 'https://x/y.png' })
    expect(res.data.id).toBe(2)
    expect(inserts[1]).toEqual({ name: 'Remo' })
  })

  it('si falta la columna image_public_id, reintenta sin ella y conserva image_url', async () => {
    respuestas.push({ data: null, error: { message: "Could not find the 'image_public_id' column of 'exercises' in the schema cache" } })
    respuestas.push({ data: { id: 3 }, error: null })
    const res = await insertExercise({ name: 'Remo', image_url: 'https://x/y.png', image_public_id: 'unamas/u/y' })
    expect(res.data.id).toBe(3)
    expect(inserts[1]).toEqual({ name: 'Remo', image_url: 'https://x/y.png' })
  })

  it('no reintenta por otros errores', async () => {
    respuestas.push({ data: null, error: { message: 'duplicate key' } })
    const res = await insertExercise({ name: 'Remo', image_url: null })
    expect(res.error.message).toBe('duplicate key')
    expect(inserts).toHaveLength(1)
  })
})

describe('removeExerciseImage', () => {
  it('ignora las imágenes que no son del bucket propio (catálogo de wger)', async () => {
    await expect(removeExerciseImage('https://wger.de/media/exercise-images/1.png')).resolves.toBeUndefined()
    await expect(removeExerciseImage(null)).resolves.toBeUndefined()
  })
})
