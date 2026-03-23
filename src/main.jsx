import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// --- BROADCAST AGENT REGISTRATION ---
// This block registers the sw.js file located in your public folder
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Broadcast Agent Registered! Scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Broadcast Agent Registration failed:', error);
      });
  });
}