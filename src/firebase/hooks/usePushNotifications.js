import { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, messaging } from '../config';

const usePushNotifications = () => {
  useEffect(() => {
    const initializeAutonomousPush = async () => {
      try {
        // 1. Silently verify the user
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // 2. CHECK PERMISSION FIRST: Do not bother them if they already said 'denied'
        if (Notification.permission === 'denied') {
          console.log("Push notifications are blocked by the user.");
          return; 
        }

        // 3. Only ask for permission if it is 'default' (first time visitor)
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        // 4. If they allowed it (either just now, or previously)
        if (permission === 'granted') {
          const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        });

          if (currentToken) {
            // 5. DATABASE OPTIMIZATION: Check local storage so we don't overwrite 
            // the exact same token in Firestore every time they refresh the page.
            const previouslySavedToken = localStorage.getItem('synced_fcm_token');
            
            if (previouslySavedToken !== currentToken) {
              const tokenRef = doc(db, 'fcm_tokens', user.uid);
              await setDoc(tokenRef, {
                token: currentToken,
                uid: user.uid,
                updatedAt: serverTimestamp(),
                platform: navigator.userAgent
              }, { merge: true });
              
              // Save to local storage so we remember it's synced
              localStorage.setItem('synced_fcm_token', currentToken);
              console.log("✅ New device token securely synced to database.");
            } else {
               console.log("⚡ Token already synced. Ready to receive broadcasts.");
            }
          }
        }
      } catch (error) {
        console.error("FCM setup failed:", error);
      }
    };

    initializeAutonomousPush();
  }, []);
};

export default usePushNotifications;