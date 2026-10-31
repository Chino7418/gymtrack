// Subida de fotos a Cloudinary con un upload preset "unsigned" (sin backend).
// Se activa solo si están las dos variables de entorno; si no, images.js usa Supabase Storage.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const cloudinaryEnabled = Boolean(CLOUD && PRESET)

const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`

// Sube el blob a la carpeta del usuario y devuelve la URL pública ya optimizada.
// f_auto,q_auto hace que Cloudinary elija formato (WebP/AVIF) y comprima al entregar.
export async function uploadToCloudinary(blob, userId) {
  const form = new FormData()
  form.append('file', blob, 'foto.jpg')
  form.append('upload_preset', PRESET)
  form.append('folder', `unamas/${userId}`)
  const res = await fetch(ENDPOINT, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = body?.error?.message ?? ''
    if (/preset/i.test(detail)) throw new Error('Revisá el preset de Cloudinary: tiene que existir y ser "unsigned"')
    if (/cloud.?name/i.test(detail)) throw new Error('Revisá el cloud name de Cloudinary')
    throw new Error(`No se pudo subir la foto a Cloudinary (error ${res.status})`)
  }
  const data = await res.json()
  if (!data.secure_url) throw new Error('Cloudinary no devolvió la URL de la foto')
  return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/')
}
