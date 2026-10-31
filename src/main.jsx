import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.css'
import './a11y.css'
import './motion.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import App from './App.jsx'
import { applyTheme } from './lib/theme'

dayjs.locale('es')
applyTheme()

// PWA: el service worker solo se registra en producción (en desarrollo cachearía los assets de Vite)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* la app funciona igual sin service worker */ })
  })
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
