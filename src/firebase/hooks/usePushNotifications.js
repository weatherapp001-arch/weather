import { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging'; // Added onMessage
import { auth, db, messaging } from '../config';

const usePushNotifications = () => {
  useEffect(() => {
    const initializeAutonomousPush = async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        if (Notification.permission === 'denied') return;

        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          if (currentToken) {
            const tokenRef = doc(db, 'fcm_tokens', user.uid);
            await setDoc(tokenRef, {
              token: currentToken,
              uid: user.uid,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }

          // --- NATIVE BEHAVIOR: Show notification even if app is OPEN ---
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            
            // Manually trigger a system notification
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/logo192.png'
            });
          });
        }
      } catch (error) {
        console.error("FCM setup failed:", error);
      }
    };

    initializeAutonomousPush();
  }, []);
};

export default usePushNotifications;