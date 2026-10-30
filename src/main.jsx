import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MotionProvider } from './components'
import { registerPwaServiceWorker } from './notifications'
import './index.css'

registerPwaServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </React.StrictMode>,
)
