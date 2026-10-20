import { useState } from 'react'

export default function PasswordInput({ wrapperClass = 'mb-2', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className={`input-group ${wrapperClass}`}>
      <input className="form-control" type={show ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}
