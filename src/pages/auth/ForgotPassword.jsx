import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setOk('')
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) setError(error.message)
    else setOk('Si existe la cuenta, se envió enlace de recuperación.')
  }

  return (
    <div className="card p-4">
      <h5 className="mb-3">Recuperar contraseña</h5>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {ok && <div className="alert alert-success py-2">{ok}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Correo electrónico</label>
          <input type="email" className="form-control" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <button className="btn btn-primary w-100" disabled={loading}>{loading?'Enviando...':'Enviar enlace'}</button>
      </form>
      <div className="mt-3 small"><Link to="/login">Volver</Link></div>
    </div>
  )
}
