import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { House, Dumbbell, ListChecks, CalendarCheck, Scale, UserRound, Sun, Moon, SunMoon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PREFS, PREF_LABEL, getPref, setPref } from '../lib/theme'

export function Protected() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-5 text-center" role="status">Cargando…</div>
  return session ? <Layout /> : <Navigate to="/login" replace />
}

const LINKS = [
  ['/', 'Inicio', House], ['/workouts', 'Entrenamientos', Dumbbell], ['/exercises', 'Ejercicios', ListChecks],
  ['/attendance', 'Asistencia', CalendarCheck], ['/weight', 'Peso', Scale], ['/profile', 'Perfil', UserRound],
]
// Barra inferior en celular. Tema, cerrar sesión y "Mis ejercicios" están en Perfil.
const TABS = [['/', 'Inicio', House], ['/workouts', 'Entrenos', Dumbbell], ['/attendance', 'Asistencia', CalendarCheck], ['/weight', 'Peso', Scale], ['/profile', 'Perfil', UserRound]]
const TEXT_FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select'

function Layout() {
  const { signOut } = useAuth()
  const [typing, setTyping] = useState(false)
  const { pathname } = useLocation()

  // Con el teclado abierto la barra inferior sube y tapa el campo: se oculta mientras se escribe
  useEffect(() => {
    const onIn = (e) => { if (e.target.matches?.(TEXT_FIELD)) setTyping(true) }
    const onOut = () => setTimeout(() => setTyping(!!document.activeElement?.matches?.(TEXT_FIELD)), 0)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut) }
  }, [])
  const first = useRef(true)

  // Al cambiar de página: título de la pestaña y foco en el h1 (para lectores de pantalla)
  useEffect(() => {
    const label = LINKS.find(([to]) => to !== '/' && pathname.startsWith(to))?.[1] ?? 'Inicio'
    document.title = `${label} · Una Más`
    if (first.current) { first.current = false; return }
    const h1 = document.querySelector('main h1')
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }) }
  }, [pathname])

  return (
    <div className="d-flex flex-column min-vh-100">
      <a href="#main" className="visually-hidden-focusable skip-link">Saltar al contenido</a>
      <nav className="navbar navbar-expand-md app-navbar">
        <div className="container">
          <span className="navbar-brand fw-bold d-flex align-items-center gap-2"><img src="/icon.svg" alt="" width="30" height="30" />Una Más</span>
          {/* En celular la navegación es la barra inferior; este menú solo se ve desde tablet */}
          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav me-auto">
              {LINKS.map(([to, label, Icon]) => (
                <li className="nav-item" key={to}>
                  <NavLink end={to === '/'} to={to} className="nav-link d-flex align-items-center gap-2"><Icon size={18} aria-hidden="true" />{label}</NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex gap-2 align-items-center py-2 py-md-0">
              <ThemeToggle />
              <button className="btn btn-outline-secondary btn-sm" onClick={signOut}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      </nav>
      <main id="main" className="container py-4 flex-grow-1 has-tabbar"><Outlet /></main>
      <nav className={`tabbar d-md-none ${typing ? 'tabbar-hidden' : ''}`} aria-label="Secciones">
        {TABS.map(([to, label, Icon]) => (
          <NavLink key={to} end={to === '/'} to={to} className="tab">
            <span className="tab-pill"><Icon size={20} aria-hidden="true" /></span>{label}
          </NavLink>
        ))}
      </nav>
      <footer className="border-top py-3 text-center small text-muted d-none d-md-block">
        Una Más · {new Date().getFullYear()} · Tus entrenamientos, en un solo lugar
      </footer>
    </div>
  )
}

// Cicla Automático → Claro → Oscuro
export function ThemeToggle() {
  const [pref, setP] = useState(getPref)
  const next = PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length]
  const change = () => { setPref(next); setP(next) }
  return (
    <button type="button" className="btn btn-outline-secondary btn-sm text-nowrap d-inline-flex align-items-center gap-2" onClick={change}
      aria-label={`Tema: ${PREF_LABEL[pref]}. Cambiar a ${PREF_LABEL[next]}`}>
      {pref === 'light' ? <Sun size={16} aria-hidden="true" /> : pref === 'dark' ? <Moon size={16} aria-hidden="true" /> : <SunMoon size={16} aria-hidden="true" />}{PREF_LABEL[pref]}
    </button>
  )
}

// Los errores se anuncian y se llevan a la vista (en el celular el botón Guardar suele estar lejos)
export function ErrorMsg({ error }) {
  const ref = useRef(null)
  useEffect(() => { if (error) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [error])
  return error ? <div ref={ref} role="alert" className="alert alert-danger py-2">{error}</div> : null
}

export const InfoMsg = ({ info }) =>
  info ? <div role="status" className="alert alert-success py-2">{info}</div> : null
