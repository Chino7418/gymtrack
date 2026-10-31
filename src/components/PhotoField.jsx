import { useId } from 'react'
import { Camera, Images, X } from 'lucide-react'

// Campo de foto de un ejercicio: "Sacar foto" abre la cámara trasera del celular (capture),
// "Galería" permite elegir una imagen guardada. src = vista previa actual (o null).
export default function PhotoField({ src, onPick, onClear, onError }) {
  const id = useId()
  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir la misma foto
    if (!f) return
    if (!f.type.startsWith('image/')) return onError?.('El archivo tiene que ser una imagen')
    onPick(f)
  }
  return (
    <div className="photo-field">
      {src
        ? <img src={src} alt="Vista previa de la foto del ejercicio" className="photo-preview" />
        : <span className="photo-preview photo-empty" aria-hidden="true"><Camera size={28} /></span>}
      <div className="d-flex flex-wrap gap-2">
        <label className="btn btn-outline-secondary mb-0" htmlFor={`${id}-cam`}><Camera size={18} aria-hidden="true" className="me-1" />Sacar foto</label>
        <input id={`${id}-cam`} type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={pick} />
        <label className="btn btn-outline-secondary mb-0" htmlFor={`${id}-gal`}><Images size={18} aria-hidden="true" className="me-1" />Galería</label>
        <input id={`${id}-gal`} type="file" accept="image/*" className="visually-hidden" onChange={pick} />
        {src && <button type="button" className="btn btn-outline-secondary" onClick={onClear}><X size={18} aria-hidden="true" className="me-1" />Quitar</button>}
      </div>
    </div>
  )
}
