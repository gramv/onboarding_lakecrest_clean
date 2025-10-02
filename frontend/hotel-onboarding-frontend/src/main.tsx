import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'
import App from './App.tsx'
import { memoryMonitor } from './utils/memoryMonitor'

// Start memory monitoring in development mode
if (import.meta.env.DEV) {
  memoryMonitor.start(30000, true) // Monitor every 30 seconds
  
  // Also log memory on window focus to track memory during active use
  window.addEventListener('focus', () => {
    memoryMonitor.snapshot('Window Focus')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
