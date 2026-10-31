import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'node:crypto'
import handler from './delete-image'

// Respuesta falsa de Vercel: guarda el status y el JSON
const res = () => {
  const r = { statusCode: 200, body: null }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  return r
}

const fetchMock = vi.fn()
const pedido = (over = {}) => ({ method: 'POST', headers: { authorization: 'Bearer jwt' }, body: { publicId: 'unamas/u1/foto' }, ...over })

// El usuario dueño de la foto (respuesta de Supabase /auth/v1/user) y el destroy de Cloudinary
const cloudOk = () => fetchMock
  .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1' }) })
  .mockResolvedValueOnce({ ok: true, json: async () => ({ result: 'ok' }) })

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'demo')
  vi.stubEnv('CLOUDINARY_API_KEY', 'key')
  vi.stubEnv('CLOUDINARY_API_SECRET', 'secret')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('api/delete-image', () => {
  it('rechaza métodos que no son POST', async () => {
    const r = res()
    await handler(pedido({ method: 'GET' }), r)
    expect(r.statusCode).toBe(405)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('avisa si faltan las credenciales del servidor', async () => {
    vi.stubEnv('CLOUDINARY_API_SECRET', '')
    const r = res()
    await handler(pedido(), r)
    expect(r.statusCode).toBe(503)
  })

  it('rechaza public_id que no está en la carpeta de la app', async () => {
    const r = res()
    await handler(pedido({ body: { publicId: 'otra/foto' } }), r)
    expect(r.statusCode).toBe(400)
  })

  it('rechaza pedidos sin sesión', async () => {
    const r = res()
    await handler(pedido({ headers: {} }), r)
    expect(r.statusCode).toBe(401)
  })

  it('no deja borrar fotos de otro usuario', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u2' }) })
    const r = res()
    await handler(pedido(), r)
    expect(r.statusCode).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('firma el destroy con el API secret y borra la foto propia', async () => {
    cloudOk()
    const r = res()
    await handler(pedido(), r)
    expect(r.statusCode).toBe(200)
    expect(r.body).toEqual({ result: 'ok' })

    const [url, opts] = fetchMock.mock.calls[1]
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/destroy')
    const form = opts.body
    expect(form.get('public_id')).toBe('unamas/u1/foto')
    expect(form.get('api_key')).toBe('key')
    const esperada = crypto.createHash('sha1')
      .update(`public_id=unamas/u1/foto&timestamp=${form.get('timestamp')}secret`)
      .digest('hex')
    expect(form.get('signature')).toBe(esperada)
  })

  it('devuelve 502 si Cloudinary rechaza el borrado', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: { message: 'nope' } }) })
    const r = res()
    await handler(pedido(), r)
    expect(r.statusCode).toBe(502)
  })
})
