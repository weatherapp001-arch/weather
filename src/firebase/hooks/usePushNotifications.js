import { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// Line 4: Cleaned up imports (removed duplicates)
import { getToken, onMessage } from 'firebase/messaging'; 
import { auth, db, messaging } from '../config';

const usePushNotifications = () => {
    useEffect(() => {
        const initializeAutonomousPush = async () => {
            try {
                // 1. Silent Auth to associate token with a UID
                const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;

                // 2. Check and Request Permission
                let permission = Notification.permission;
                if (permission === 'denied') {
                    console.warn("Notifications blocked by user.");
                    return;
                }
                
                if (permission === 'default') {
                    permission = await Notification.requestPermission();
                }

                if (permission === 'granted') {
                    // 3. Register Service Worker explicitly for background tasks
                    // Line 27: Ensuring the SW is ready before grabbing the token
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    
                    const currentToken = await getToken(messaging, {
                        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (currentToken) {
                        // 4. Sync Token to Firestore
                        const tokenRef = doc(db, 'fcm_tokens', user.uid);
                        await setDoc(tokenRef, {
                            token: currentToken,
                            uid: user.uid,
                            updatedAt: serverTimestamp(),
                            lastPlatform: navigator.userAgent
                        }, { merge: true });
                        
                        console.log("🚀 System Tray Token Active");
                    }

                    // 5. Handle FOREGROUND notifications (App is open)
                    // This ensures even if the user is looking at the app, they get a popup
                    onMessage(messaging, (payload) => {
                        console.log('Foreground message:', payload);
                        
                        // Create a manual native notification
                        const notificationTitle = payload.notification.title;
                        const notificationOptions = {
                            body: payload.notification.body,
                            icon: '/logo192.png',
                            badge: '/logo192.png'
                        };

                        new Notification(notificationTitle, notificationOptions);
                    });
                }
            } catch (error) {
                // Line 60: Catching setup/registration errors
                console.error("Line 61: FCM Push Initialization failed:", error);
            }
        };

        initializeAutonomousPush();
    }, []);
};

export default usePushNotifications;