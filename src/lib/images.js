// Imágenes de ejercicios: Cloudinary si está configurado; si no, Supabase Storage
// (bucket público "exercise-images", carpeta por usuario)
import { supabase } from './supabaseClient'
import { cloudinaryEnabled, uploadToCloudinary, deleteCloudinaryImage } from './cloudinary'

export const BUCKET = 'exercise-images'
const MAX_SIDE = 800

// Achica la foto en el navegador (lado mayor 800 px, JPEG) para que suba rápido y no pese
export async function shrink(file, maxSide = MAX_SIDE) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85))
}

// Sube la imagen a la carpeta del usuario y devuelve su URL pública y su public_id
export async function uploadExerciseImage(file, userId) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo tiene que ser una imagen')
  const blob = await shrink(file)
  if (cloudinaryEnabled) return uploadToCloudinary(blob, userId)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message === 'Bucket not found' ? 'Falta configurar el almacenamiento de imágenes en Supabase' : error.message)
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, publicId: null }
}

// Borra una imagen propia. Con publicId es de Cloudinary (la borra /api/delete-image);
// si no, se saca del bucket de Supabase. Las del catálogo de wger se ignoran.
export async function removeExerciseImage(url, publicId) {
  if (publicId) return deleteCloudinaryImage(publicId)
  const marker = `/object/public/${BUCKET}/`
  const i = url?.indexOf(marker) ?? -1
  if (i < 0) return
  await supabase.storage.from(BUCKET).remove([url.slice(i + marker.length)])
}

// Inserta un ejercicio; si la base todavía no tiene las columnas de imagen (migración sin aplicar),
// reintenta sin la que falta.
export async function insertExercise(row) {
  let payload = { ...row }
  for (;;) {
    const res = await supabase.from('exercises').insert(payload).select().single()
    if (!res.error) return res
    const missing = ['image_url', 'image_public_id'].filter((c) => c in payload && res.error.message.includes(c))
    if (!missing.length) return res
    payload = { ...payload }
    for (const c of missing) delete payload[c]
  }
}
