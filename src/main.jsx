import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MotionProvider } from './components'
import { registerPwaServiceWorker } from './notifications'
import './index.css'

registerPwaServiceWorker()

// Handle iOS Safari / Mobile Virtual Keyboard resize & offset
if (typeof window !== 'undefined' && window.visualViewport) {
  const syncKeyboardOffset = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--keyboard-offset', `${Math.round(keyboardHeight)}px`);
  };
  window.visualViewport.addEventListener('resize', syncKeyboardOffset);
  window.visualViewport.addEventListener('scroll', syncKeyboardOffset);
  syncKeyboardOffset();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </React.StrictMode>,
)
