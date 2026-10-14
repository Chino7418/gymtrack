import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorMsg } from '../components/Layout'

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
    try { await fn(setInfo) } catch (err) { setError(err.message) }
    setBusy(false)
  }
  return { error, info, busy, run }
}

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
        <input className="form-control mb-2" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="form-control mb-3" type="password" placeholder="Contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />
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
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const { error, info, busy, run } = useSubmit(async (setInfo) => {
    if (f.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
    const { data, error } = await signUp(f.email, f.password, f.name)
    if (error) throw error
    if (data.session) nav('/')
    else setInfo('Revisá tu email para confirmar la cuenta.')
  })
  return (
    <Shell title="Crear cuenta">
      <form onSubmit={run}>
        <ErrorMsg error={error} />
        {info && <div className="alert alert-success py-2">{info}</div>}
        <input className="form-control mb-2" placeholder="Nombre" value={f.name} onChange={set('name')} />
        <input className="form-control mb-2" type="email" placeholder="Email" required value={f.email} onChange={set('email')} />
        <input className="form-control mb-3" type="password" placeholder="Contraseña (mín. 6)" required value={f.password} onChange={set('password')} />
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
        <input className="form-control mb-3" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
        <input className="form-control mb-3" type="password" placeholder="Nueva contraseña" required value={p} onChange={(e) => setP(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>Guardar</button>
      </form>
    </Shell>
  )
}
