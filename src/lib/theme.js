// Tema claro ("Oro claro") / oscuro ("Oro olímpico"). Por defecto sigue al sistema; el usuario puede fijarlo.
const KEY = 'unamas.theme'
export const PREFS = ['system', 'light', 'dark']
export const PREF_LABEL = { system: 'Automático', light: 'Claro', dark: 'Oscuro' }

const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getPref() {
  try { const p = localStorage.getItem(KEY); return PREFS.includes(p) ? p : 'system' } catch { return 'system' }
}

export const resolve = (pref) => (pref === 'system' ? (media.matches ? 'dark' : 'light') : pref)

export function applyTheme(pref = getPref()) {
  const theme = resolve(pref)
  document.documentElement.setAttribute('data-bs-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f0f13' : '#f5f3ec')
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }))
}

export function setPref(pref) {
  try { localStorage.setItem(KEY, pref) } catch { /* sin storage */ }
  applyTheme(pref)
}

media.addEventListener('change', () => { if (getPref() === 'system') applyTheme('system') })
