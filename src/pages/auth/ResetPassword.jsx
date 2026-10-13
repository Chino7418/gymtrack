import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setOk('')
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error.message)
    else { setOk('Contraseña actualizada'); setTimeout(()=>navigate('/login'), 1200) }
  }

  return (
    <div className="card p-4">
      <h5 className="mb-3">Restablecer contraseña</h5>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {ok && <div className="alert alert-success py-2">{ok}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nueva contraseña</label>
          <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary w-100" disabled={loading}>{loading?'Actualizando...':'Actualizar'}</button>
      </form>
    </div>
  )
}
