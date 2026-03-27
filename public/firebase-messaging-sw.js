// File: public/firebase-messaging-sw.js
// Function: Consolidated Service Worker (Caching + FCM)
// Line: 1-95

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 1. Initialize Firebase
// Note: Hardcoded keys are required here as SW cannot access Vite env variables
firebase.initializeApp({
  apiKey: "AIzaSyAkGm-zqxaELtHYdX8HnVvwtujEdrcj_pY",
  authDomain: "weather-alert-7a801.firebaseapp.com",
  projectId: "weather-alert-7a801",
  messagingSenderId: "69205239873",
  appId: "1:69205239873:web:10dcfdbda6dc1b3381fec0"
});

const messaging = firebase.messaging();

// --- OFFLINE CACHING LOGIC ---
const CACHE_NAME = 'weather-dashboard-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Fetch: Serve from cache if offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// --- FCM BACKGROUND LISTENER ---
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message ', payload);

  const notificationTitle = payload.notification.title || '🚨 Weather Alert';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true, 
    tag: 'emergency-broadcast',
    actions: [
      { action: 'acknowledge', title: '✅ I am Safe' },
      { action: 'open', title: '🔍 View Dashboard' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- NOTIFICATION CLICK HANDLER ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'acknowledge') {
    // This logs in the Service Worker console (viewable in Application tab)
    console.log("Status: SAFE logged from background.");
  } else {
    // Open or focus the app window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});