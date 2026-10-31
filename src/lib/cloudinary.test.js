import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Supabase falso: solo se usa cuando Cloudinary no está configurado
const { subida } = vi.hoisted(() => ({ subida: vi.fn(async () => ({ error: null })) }))
vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-de-prueba' } } }) },
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

// Reimporta los módulos con las variables de Cloudinary dadas (vacías = fallback a Supabase)
const setup = async ({ cloud = 'demo', preset = 'unamas' } = {}) => {
  vi.resetModules()
  vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', cloud)
  vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', preset)
  const [images, cloudinary] = await Promise.all([import('./images'), import('./cloudinary')])
  return { ...images, ...cloudinary }
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
  it('sube la foto al preset y devuelve la URL optimizada y el public_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/unamas/u1/foto.jpg',
        public_id: 'unamas/u1/foto',
      }),
    })
    const { uploadExerciseImage } = await setup()
    const up = await uploadExerciseImage(foto(), 'u1')
    expect(up).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/unamas/u1/foto.jpg',
      publicId: 'unamas/u1/foto',
    })
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
    const up = await uploadExerciseImage(foto(), 'u1')
    expect(up).toEqual({ url: 'https://supabase.test/foto.jpg', publicId: null })
    expect(subida).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('pide borrar la foto a la función del servidor con la sesión', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: 'ok' }) })
    const { deleteCloudinaryImage } = await setup()
    await deleteCloudinaryImage('unamas/u1/foto')
    const [endpoint, opts] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('/api/delete-image')
    expect(opts.headers.Authorization).toBe('Bearer jwt-de-prueba')
    expect(JSON.parse(opts.body)).toEqual({ publicId: 'unamas/u1/foto' })
  })

  it('borra por public_id aunque la URL sea de Cloudinary', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: 'ok' }) })
    const { removeExerciseImage } = await setup()
    await removeExerciseImage('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/unamas/u1/foto.jpg', 'unamas/u1/foto')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/delete-image')
  })

  it('no llama al servidor si no hay public_id', async () => {
    const { deleteCloudinaryImage } = await setup()
    await deleteCloudinaryImage(null)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
