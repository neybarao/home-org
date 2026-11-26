import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { setupUpdates } from './lib/update'
import '@fontsource-variable/onest'
import './index.css'

setupUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
