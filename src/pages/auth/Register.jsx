import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function Register() {
  const [form, setForm] = useState({ first_name:'', last_name:'', username:'', email:'', password:'' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (form.password.length < 6) { setError('Contraseña mínima 6 caracteres'); return }
    setLoading(true)
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      options: { data: { first_name: form.first_name, last_name: form.last_name, username: form.username } }
    })
    setLoading(false)
    if (error) setError(error.message)
    else { setOk('Registro enviado. Revisa tu correo si es necesario.'); setTimeout(()=>navigate('/login'), 1500) }
  }

  return (
    <div className="card p-4">
      <h5 className="mb-3">Crear cuenta</h5>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {ok && <div className="alert alert-success py-2">{ok}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-2">
            <label className="form-label">Nombre</label>
            <input className="form-control" name="first_name" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="col-md-6 mb-2">
            <label className="form-label">Apellido</label>
            <input className="form-control" name="last_name" value={form.last_name} onChange={handleChange} required />
          </div>
        </div>
        <div className="mb-2">
          <label className="form-label">Nombre de usuario</label>
          <input className="form-control" name="username" value={form.username} onChange={handleChange} required />
        </div>
        <div className="mb-2">
          <label className="form-label">Correo electrónico</label>
          <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn btn-primary w-100" disabled={loading}>{loading?'Creando...':'Registrarse'}</button>
      </form>
      <div className="mt-3 small"><Link to="/login">Volver a iniciar sesión</Link></div>
    </div>
  )
}
