import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.css'
import './a11y.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import App from './App.jsx'
import { applyTheme } from './lib/theme'

dayjs.locale('es')
applyTheme()

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
