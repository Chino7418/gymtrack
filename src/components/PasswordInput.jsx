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
        aria-pressed={show}
        aria-controls={props.id}
      >
        {show ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}
