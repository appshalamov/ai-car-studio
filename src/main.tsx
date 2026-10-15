import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

// Android/desktop Chrome offers a native install prompt; keep it for the install sheet.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __installPrompt?: Event }).__installPrompt = e
  window.dispatchEvent(new Event('install-available'))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
