import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function MainLayout() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }
  return (
    <>
      <nav className="navbar navbar-expand-lg mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">GymTrack</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-controls="nav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" style={{filter:'invert(1)'}}></span>
          </button>
          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item"><NavLink className="nav-link" to="/">Inicio</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/exercises">Ejercicios</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/workouts">Entrenamientos</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/attendance">Asistencia</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/weight">Peso</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/profile">Perfil</NavLink></li>
            </ul>
            <div className="d-flex align-items-center">
              <span className="me-3 text-muted">{profile?.username}</span>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Salir</button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mb-5">
        <Outlet />
      </main>
    </>
  )
}
