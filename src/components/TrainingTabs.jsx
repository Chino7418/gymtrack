import { NavLink } from 'react-router-dom'

// Solapas de la sección Entrenos: el historial y la lista de ejercicios propios
export default function TrainingTabs() {
  return (
    <nav className="seg mb-3" aria-label="Entrenos">
      <NavLink to="/workouts" end className="seg-item">Entrenamientos</NavLink>
      <NavLink to="/exercises" className="seg-item">Mis ejercicios</NavLink>
    </nav>
  )
}
