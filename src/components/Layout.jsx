import { useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Protected() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-5 text-center">Cargando…</div>
  return session ? <Layout /> : <Navigate to="/login" replace />
}

function Layout() {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const links = [
    ['/', 'Inicio'], ['/workouts', 'Entrenamientos'], ['/exercises', 'Ejercicios'], ['/attendance', 'Asistencia'],
    ['/weight', 'Peso'], ['/profile', 'Perfil'],
  ]
  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand fw-bold">GymTrack</span>
          <button className="navbar-toggler" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="nav" aria-label="Menú">
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse ${open ? 'show' : ''}`} id="nav">
            <ul className="navbar-nav me-auto">
              {links.map(([to, label]) => (
                <li className="nav-item" key={to}>
                  <NavLink end={to === '/'} to={to} className="nav-link" onClick={close}>{label}</NavLink>
                </li>
              ))}
            </ul>
            <button className="btn btn-outline-light btn-sm" onClick={signOut}>Cerrar sesión</button>
          </div>
        </div>
      </nav>
      <main className="container py-4 flex-grow-1"><Outlet /></main>
      <footer className="border-top py-3 text-center small text-muted">
        GymTrack · {new Date().getFullYear()} · Tus entrenamientos, en un solo lugar
      </footer>
    </div>
  )
}

export const ErrorMsg = ({ error }) =>
  error ? <div className="alert alert-danger py-2">{error}</div> : null
