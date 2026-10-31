import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Supabase falso: solo se usa cuando Cloudinary no está configurado
const { subida } = vi.hoisted(() => ({ subida: vi.fn(async () => ({ error: null })) }))
vi.mock('./supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: subida,
        getPublicUrl: () => ({ data: { publicUrl: 'https://supabase.test/foto.jpg' } }),
        remove: vi.fn(),
      }),
    },
  },
}))

const fetchMock = vi.fn()
const foto = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

// Reimporta images.js con las variables de Cloudinary dadas (vacías = fallback a Supabase)
const setup = async ({ cloud = 'demo', preset = 'unamas' } = {}) => {
  vi.resetModules()
  vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', cloud)
  vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', preset)
  return import('./images')
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  // jsdom no trae createImageBitmap ni canvas real: alcanza con lo que usa shrink()
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1600, height: 1200, close: vi.fn() })))
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }))
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(['x'], { type: 'image/jpeg' })))
  fetchMock.mockReset()
  subida.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Cloudinary', () => {
  it('sube la foto al preset y devuelve la URL optimizada', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/unamas/u1/foto.jpg' }),
    })
    const { uploadExerciseImage } = await setup()
    const url = await uploadExerciseImage(foto(), 'u1')
    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/unamas/u1/foto.jpg')
    const [endpoint, opts] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://api.cloudinary.com/v1_1/demo/image/upload')
    expect(opts.method).toBe('POST')
    expect(opts.body.get('upload_preset')).toBe('unamas')
    expect(opts.body.get('folder')).toBe('unamas/u1')
    expect(opts.body.get('file')).toBeInstanceOf(Blob)
    expect(subida).not.toHaveBeenCalled()
  })

  it('muestra un error claro si el preset no existe', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Upload preset not found' } }) })
    const { uploadExerciseImage } = await setup()
    await expect(uploadExerciseImage(foto(), 'u1')).rejects.toThrow('Revisá el preset de Cloudinary')
  })

  it('sin variables de entorno guarda en Supabase', async () => {
    const { uploadExerciseImage } = await setup({ cloud: '', preset: '' })
    const url = await uploadExerciseImage(foto(), 'u1')
    expect(url).toBe('https://supabase.test/foto.jpg')
    expect(subida).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no intenta borrar fotos de Cloudinary desde el navegador', async () => {
    const { removeExerciseImage } = await setup()
    await expect(removeExerciseImage('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/unamas/u1/foto.jpg')).resolves.toBeUndefined()
  })
})
