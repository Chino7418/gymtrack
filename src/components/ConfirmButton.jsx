import { useEffect, useRef, useState } from 'react'

// Borrado en dos pasos sin confirm() nativo: "Borrar" → "Sí, borrar" / "Cancelar"
export default function ConfirmButton({ onConfirm, label = 'Borrar', confirmLabel = 'Sí, borrar', what = '' }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef(null)
  const triggerRef = useRef(null)
  const wasAsking = useRef(false)

  useEffect(() => {
    if (asking) cancelRef.current?.focus()
    else if (wasAsking.current) triggerRef.current?.focus()
    wasAsking.current = asking
  }, [asking])

  const confirm = async () => { setBusy(true); await onConfirm(); setBusy(false); setAsking(false) }

  if (!asking) {
    return (
      <button ref={triggerRef} type="button" className="btn btn-sm btn-outline-danger" onClick={() => setAsking(true)}
        aria-label={what ? `${label} ${what}` : undefined}>{label}</button>
    )
  }
  return (
    <span className="d-inline-flex gap-2" role="group" aria-label={what ? `Confirmar borrado de ${what}` : 'Confirmar borrado'}
      onKeyDown={(e) => e.key === 'Escape' && setAsking(false)}>
      <button ref={cancelRef} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAsking(false)}>Cancelar</button>
      <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={confirm}>{busy ? 'Borrando…' : confirmLabel}</button>
    </span>
  )
}
