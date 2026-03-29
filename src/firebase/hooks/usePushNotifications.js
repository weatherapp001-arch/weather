import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging'; 
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db, messaging } from '../config';

const usePushNotifications = () => {
  useEffect(() => {
    const provider = new GoogleAuthProvider();

    const initializeAutonomousPush = async () => {
      // Line 15: Monitor Auth state. If no user, show the Email Selection popup.
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          try {
            // This is the one-time email selection popup
            await signInWithPopup(auth, provider);
          } catch (err) {
            console.warn("User dismissed the email verification.");
            return;
          }
        }

        // Line 28: Once the email is selected, register this device in Firestore
        if (user) {
          try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const currentToken = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
              });

              if (currentToken) {
                const tokenRef = doc(db, 'fcm_tokens', currentToken.substring(0, 20));
                await setDoc(tokenRef, {
                  token: currentToken,
                  uid: user.uid,
                  email: user.email, // Registered Email ID
                  updatedAt: serverTimestamp(),
                  platform: navigator.userAgent
                }, { merge: true });
              }
            }
          } catch (error) {
            console.error("FCM Registration failed:", error);
          }
        }
      });
    };

    initializeAutonomousPush();
  }, []);
};

export default usePushNotifications;