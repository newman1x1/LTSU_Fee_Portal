import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import('@emailjs/browser').then(m => {
  m.default.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '')
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
