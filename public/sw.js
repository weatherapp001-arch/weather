// --- 1. THE INCOMING ALERT LISTENER ---
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : { 
    title: "UIT Naini Alert", 
    body: "New safety update available." 
  };
  
  const options = {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    
    // Forces the notification to stay on screen
    requireInteraction: true, 
    
    tag: 'naini-emergency-alert',
    actions: [
      {
        action: 'acknowledge',
        title: 'I am Safe (Acknowledge)'
      },
      {
        action: 'open_dashboard',
        title: 'View Details'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// --- 2. THE BUTTON CLICK LISTENER ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'acknowledge') {
    // Logic for acknowledgment can be added here
    console.log("Student acknowledged the alert.");
  } else {
    // Opens your dashboard link
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});