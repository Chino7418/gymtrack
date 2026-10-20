const MAPA = [
  ['Invalid login credentials', 'Email o contraseña incorrectos'],
  ['Email not confirmed', 'Todavía no confirmaste tu email'],
  ['User already registered', 'Ya existe una cuenta con ese email'],
  ['Password should be at least', 'La contraseña es demasiado corta'],
  ['New password should be different', 'La nueva contraseña debe ser distinta a la anterior'],
  ['email rate limit exceeded', 'Se enviaron demasiados emails. Probá de nuevo en un rato'],
  ['Unable to validate email address', 'El email no es válido'],
  ['Failed to fetch', 'No se pudo conectar con el servidor'],
  ['NetworkError', 'No se pudo conectar con el servidor'],
]

export function traducir(msg = '') {
  const hit = MAPA.find(([en]) => msg.includes(en))
  return hit ? hit[1] : msg
}
