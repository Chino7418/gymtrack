// Catálogo público de ejercicios de wger.de (gratis, sin API key).
const BASE = 'https://wger.de/api/v2'
const ES = 4
const EN = 2

export const CATEGORIAS = [
  { id: 11, label: 'Pecho' }, { id: 12, label: 'Espalda' }, { id: 13, label: 'Hombros' },
  { id: 8, label: 'Brazos' }, { id: 9, label: 'Piernas' }, { id: 14, label: 'Pantorrillas' },
  { id: 10, label: 'Abdomen' }, { id: 15, label: 'Cardio' },
]

// Categoría de wger (+ músculos principales) → grupo muscular de nuestra tabla
const grupo = (cat, muscles) => {
  const has = (...ids) => muscles.some((m) => ids.includes(m.id))
  switch (cat) {
    case 11: return 'Pecho'
    case 12: return 'Espalda'
    case 13: return 'Hombros'
    case 10: return 'Abdomen'
    case 14: return 'Piernas'
    case 9: return has(8) ? 'Gluteos' : 'Piernas'
    case 8: return has(5) ? 'Triceps' : has(1, 13) ? 'Biceps' : 'Otro'
    default: return 'Otro'
  }
}

const texto = (html) => new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent.trim()

const cache = new Map()

export async function ejerciciosPorCategoria(cat) {
  if (cache.has(cat)) return cache.get(cat)
  const res = await fetch(`${BASE}/exerciseinfo/?category=${cat}&limit=300`)
  if (!res.ok) throw new Error('No se pudo cargar el catálogo de ejercicios')
  const { results } = await res.json()
  const list = results
    .map((e) => {
      const t = e.translations.find((x) => x.language === ES) ?? e.translations.find((x) => x.language === EN)
      if (!t?.name?.trim()) return null
      return {
        id: e.id,
        name: t.name.trim().slice(0, 150),
        muscle_group: grupo(e.category.id, e.muscles),
        description: texto(t.description) || null,
        equipment: e.equipment.map((q) => q.name).join(', '),
        spanish: t.language === ES,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  cache.set(cat, list)
  return list
}
