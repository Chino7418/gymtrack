import crypto from 'node:crypto'

// Borra una foto de Cloudinary. El API secret no puede viajar al frontend, así que la firma
// se arma acá, después de validar el JWT de Supabase y que la foto esté en la carpeta del
// usuario (unamas/<user_id>/).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const cloud = process.env.VITE_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !apiKey || !apiSecret) return res.status(503).json({ error: 'Cloudinary no está configurado en el servidor' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}') } catch { body = {} }
  }
  const { publicId } = body ?? {}
  if (typeof publicId !== 'string' || !publicId.startsWith('unamas/')) {
    return res.status(400).json({ error: 'public_id inválido' })
  }

  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!token || !supabaseUrl || !anonKey) return res.status(401).json({ error: 'Sin sesión' })

  const who = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!who?.ok) return res.status(401).json({ error: 'Sesión inválida' })
  const user = await who.json().catch(() => null)
  if (!user?.id || !publicId.startsWith(`unamas/${user.id}/`)) {
    return res.status(403).json({ error: 'Esa foto no es tuya' })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto.createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  const form = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  })
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: 'POST', body: form })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) return res.status(502).json({ error: 'Cloudinary rechazó el borrado' })
  return res.status(200).json({ result: data.result ?? 'ok' })
}
