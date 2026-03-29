import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging'; 
import { auth, db, messaging } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const usePushNotifications = () => {
    useEffect(() => {
        const provider = new GoogleAuthProvider();

        const initializeAutonomousPush = async () => {
            onAuthStateChanged(auth, async (user) => {
                // Line 15: If not logged in, trigger the Google Popup immediately
                if (!user) {
                    try {
                        await signInWithPopup(auth, provider);
                    } catch (err) {
                        console.warn("User closed the sign-in popup.");
                        return;
                    }
                }

                // Line 25: User is now authenticated, proceed with Token Sync
                try {
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
                            // Line 41: Link Token + Email in Firestore
                            const tokenRef = doc(db, 'fcm_tokens', currentToken.substring(0, 20));
                            await setDoc(tokenRef, {
                                token: currentToken,
                                uid: user.uid,
                                email: user.email,
                                updatedAt: serverTimestamp(),
                            }, { merge: true });
                            
                            console.log("🚀 Device & Email Linked for Broadcast");
                        }

                        onMessage(messaging, (payload) => {
                            new Notification(payload.notification.title, {
                                body: payload.notification.body,
                                icon: '/logo192.png'
                            });
                        });
                    }
                } catch (error) {
                    console.error("Line 62: Push Sync failed:", error);
                }
            });
        };

        initializeAutonomousPush();
    }, []);
};

export default usePushNotifications;