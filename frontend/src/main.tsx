import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/pages.css'
import './styles/theme.css'
import './styles/motion.css'
import './styles/zen.css'
import './styles/intro.css'
import App from './App.tsx'
import { installRipples } from './lib/ripple.ts'
import './lib/theme.ts'

installRipples()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
