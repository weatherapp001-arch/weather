import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './firebase/auth' // Line 4: Importing your Context Provider
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Line 11: Wrapping App to provide Global Auth State */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// --- PWA & EMERGENCY ALERT REGISTRATION ---
// Line 18: Registering the Firebase Service Worker for PWA and Background Notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/firebase-messaging-sw.js') // Updated path for FCM compatibility
            .then((registration) => {
                console.log('PWA & FCM Service Worker Registered! Scope:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker Registration failed:', error);
            });
    });
}