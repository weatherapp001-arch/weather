import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging'; 
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db, messaging } from '../config';

const usePushNotifications = () => {
  useEffect(() => {
    const provider = new GoogleAuthProvider();

    const initializeAutonomousPush = async () => {
      // Monitor Auth State to link Token with Email
      onAuthStateChanged(auth, async (user) => {
        // If not logged in, trigger the frictionless "tap email" popup
        if (!user) {
          try {
            await signInWithPopup(auth, provider);
          } catch (err) {
            console.warn("User closed the verification popup.");
            return;
          }
        }

        try {
          let permission = Notification.permission;
          if (permission === 'default') {
            permission = await Notification.requestPermission();
          }

          if (permission === 'granted') {
            // Register service worker for background alerts [cite: 147]
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            
            const currentToken = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration
            });

            if (currentToken) {
              // Link token to user's UID and Email for broadcast targeting [cite: 150]
              const tokenRef = doc(db, 'fcm_tokens', currentToken.substring(0, 20));
              await setDoc(tokenRef, {
                token: currentToken,
                uid: user.uid,
                email: user.email,
                updatedAt: serverTimestamp(),
                lastPlatform: navigator.userAgent
              }, { merge: true });
            }

            // Handle foreground alerts while site is open
            onMessage(messaging, (payload) => {
              new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/logo192.png'
              });
            });
          }
        } catch (error) {
          console.error("FCM Initialization failed:", error);
        }
      });
    };

    initializeAutonomousPush();
  }, []);
};

export default usePushNotifications;