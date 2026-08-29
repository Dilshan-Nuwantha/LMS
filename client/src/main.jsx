import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Domain redirect - runs before React mounts
import { performDomainRedirect } from './config/redirect.js'

// Perform redirect check immediately
// If redirect happens, the page will navigate away and code below won't execute
if (performDomainRedirect()) {
  // Stop execution if redirecting
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
