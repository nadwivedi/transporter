import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppSecure from './AppSecure.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppSecure />
  </StrictMode>,
)
