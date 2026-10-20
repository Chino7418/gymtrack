import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'
import PasswordInput from '../components/PasswordInput'
import { traducir } from '../lib/errores'

function Shell({ title, children }) {
  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1 className="h3 text-center mt-5 mb-4">GymTrack</h1>
      <div className="card card-body">
        <h2 className="h5 mb-3">{title}</h2>
        {children}
      </div>
    </div>
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
    nav('/')
  })
  return (
    <Shell title="Iniciar sesión">
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        <input className="form-control mb-2" {...emailProps} placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput wrapperClass="mb-3" autoComplete="current-password" placeholder="Contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <div className="d-flex justify-content-between mt-3 small">
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
        {info && <div className="alert alert-success py-2">{info}</div>}
        <input className="form-control mb-2" placeholder="Nombre" value={f.first_name} onChange={set('first_name')} />
        <input className="form-control mb-2" placeholder="Apellido" value={f.last_name} onChange={set('last_name')} />
        <input className="form-control mb-2" placeholder="Usuario" autoCapitalize="none" value={f.username} onChange={set('username')} />
        <input className="form-control mb-2" {...emailProps} placeholder="Email" required value={f.email} onChange={set('email')} />
        <PasswordInput wrapperClass="mb-3" autoComplete="new-password" placeholder="Contraseña (mín. 6)" required value={f.password} onChange={set('password')} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creando…' : 'Registrarme'}</button>
      </form>
      <div className="mt-3 small"><Link to="/login">Ya tengo cuenta</Link></div>
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
        {info && <div className="alert alert-success py-2">{info}</div>}
        <input className="form-control mb-3" {...emailProps} placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>Enviar enlace</button>
      </form>
      <div className="mt-3 small"><Link to="/login">Volver</Link></div>
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
    <Shell title="Nueva contraseña">
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        {info && <div className="alert alert-success py-2">{info}</div>}
        <PasswordInput wrapperClass="mb-3" autoComplete="new-password" placeholder="Nueva contraseña" required value={p} onChange={(e) => setP(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>Guardar</button>
      </form>
    </Shell>
  )
}
