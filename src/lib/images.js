// Imágenes de ejercicios en Supabase Storage (bucket público "exercise-images", carpeta por usuario)
import { supabase } from './supabaseClient'

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

// Sube la imagen a la carpeta del usuario y devuelve su URL pública
export async function uploadExerciseImage(file, userId) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo tiene que ser una imagen')
  const blob = await shrink(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message === 'Bucket not found' ? 'Falta configurar el almacenamiento de imágenes en Supabase' : error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Borra una imagen propia a partir de su URL pública (las del catálogo de wger se ignoran)
export async function removeExerciseImage(url) {
  const marker = `/object/public/${BUCKET}/`
  const i = url?.indexOf(marker) ?? -1
  if (i < 0) return
  await supabase.storage.from(BUCKET).remove([url.slice(i + marker.length)])
}

// Inserta un ejercicio; si la base todavía no tiene la columna image_url (migración sin aplicar), reintenta sin ella
export async function insertExercise(row) {
  let res = await supabase.from('exercises').insert(row).select().single()
  if (res.error && row.image_url !== undefined && /image_url/.test(res.error.message)) {
    const { image_url, ...rest } = row // eslint-disable-line no-unused-vars
    res = await supabase.from('exercises').insert(rest).select().single()
  }
  return res
}
