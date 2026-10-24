import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg, InfoMsg } from '../components/Layout'
import PasswordInput from '../components/PasswordInput'
import { traducir } from '../lib/errores'

function Shell({ title, children, guest = true }) {
  const { session, loading } = useAuth()
  if (guest && loading) return null
  if (guest && session) return <Navigate to="/" replace />
  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <div className="text-center mt-5 mb-4"><img src="/icon.svg" alt="" width="76" height="76" className="mb-2" /><h1 className="h3 fw-bold mb-0">Una Más</h1><p className="text-muted small mb-0">Siempre se puede una más</p></div>
      <div className="card card-body">
        <h2 className="h5 mb-3">{title}</h2>
        {children}
      </div>
    </main>
  )
}

function useSubmit(fn) {
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try { await fn(setInfo) } catch (err) { setError(traducir(err.message)) }
    setBusy(false)
  }
  return { error, info, busy, run }
}

const emailProps = { type: 'email', autoComplete: 'email', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }

export function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, busy, run } = useSubmit(async () => {
    const { error } = await signIn(email, password)
    if (error) throw error
    nav('/', { replace: true })
  })
  return (
    <Shell title="Iniciar sesión">
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        <label className="form-label" htmlFor="login-email">Email</label>
        <input id="login-email" className="form-control mb-3" {...emailProps} required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="form-label" htmlFor="login-pass">Contraseña</label>
        <PasswordInput id="login-pass" wrapperClass="mb-3" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <div className="d-flex justify-content-between flex-wrap gap-2 mt-2 auth-links">
        <Link to="/register">Crear cuenta</Link>
        <Link to="/forgot">Olvidé mi contraseña</Link>
      </div>
    </Shell>
  )
}

export function Register() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ first_name: '', last_name: '', username: '', email: '', password: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const { error, info, busy, run } = useSubmit(async (setInfo) => {
    if (!f.first_name.trim() || !f.last_name.trim()) throw new Error('Nombre y apellido son obligatorios')
    if (f.username.trim().length < 3) throw new Error('El usuario debe tener al menos 3 caracteres')
    if (f.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
    const { data, error } = await signUp(f.email, f.password, {
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      username: f.username.trim(),
    })
    if (error) {
      throw new Error(error.message.includes('Database error') ? 'Ese nombre de usuario ya está en uso' : error.message)
    }
    if (data.session) nav('/')
    else setInfo('Revisá tu email para confirmar la cuenta.')
  })
  return (
    <Shell title="Crear cuenta">
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        <InfoMsg info={info} />
        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="form-label" htmlFor="reg-first">Nombre</label>
            <input id="reg-first" className="form-control" autoComplete="given-name" required value={f.first_name} onChange={set('first_name')} />
          </div>
          <div className="col-6">
            <label className="form-label" htmlFor="reg-last">Apellido</label>
            <input id="reg-last" className="form-control" autoComplete="family-name" required value={f.last_name} onChange={set('last_name')} />
          </div>
        </div>
        <label className="form-label" htmlFor="reg-user">Usuario</label>
        <input id="reg-user" className="form-control mb-3" autoComplete="username" autoCapitalize="none" required minLength={3} value={f.username} onChange={set('username')} />
        <label className="form-label" htmlFor="reg-email">Email</label>
        <input id="reg-email" className="form-control mb-3" {...emailProps} required value={f.email} onChange={set('email')} />
        <label className="form-label" htmlFor="reg-pass">Contraseña <span className="text-muted small">(mínimo 6)</span></label>
        <PasswordInput id="reg-pass" wrapperClass="mb-3" autoComplete="new-password" required minLength={6} value={f.password} onChange={set('password')} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creando…' : 'Registrarme'}</button>
      </form>
      <div className="mt-2 auth-links"><Link to="/login">Ya tengo cuenta</Link></div>
    </Shell>
  )
}

export function Forgot() {
  const { forgot } = useAuth()
  const [email, setEmail] = useState('')
  const { error, info, busy, run } = useSubmit(async (setInfo) => {
    const { error } = await forgot(email)
    if (error) throw error
    setInfo('Te enviamos un enlace para restablecer la contraseña.')
  })
  return (
    <Shell title="Recuperar contraseña">
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        <InfoMsg info={info} />
        <label className="form-label" htmlFor="forgot-email">Email</label>
        <input id="forgot-email" className="form-control mb-3" {...emailProps} required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
      </form>
      <div className="mt-2 auth-links"><Link to="/login">Volver</Link></div>
    </Shell>
  )
}

export function Reset() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const [p, setP] = useState('')
  const { error, info, busy, run } = useSubmit(async (setInfo) => {
    if (p.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
    const { error } = await updatePassword(p)
    if (error) throw error
    setInfo('Contraseña actualizada.')
    setTimeout(() => nav('/'), 1200)
  })
  return (
    <Shell title="Nueva contraseña" guest={false}>
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        <InfoMsg info={info} />
        <label className="form-label" htmlFor="reset-pass">Nueva contraseña <span className="text-muted small">(mínimo 6)</span></label>
        <PasswordInput id="reset-pass" wrapperClass="mb-3" autoComplete="new-password" required minLength={6} value={p} onChange={(e) => setP(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Shell>
  )
}
