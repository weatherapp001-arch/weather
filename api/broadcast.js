import { db, messaging } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
    // Always set content-type to JSON
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { title, body } = req.body;
        
        // 1. Fetch tokens from your confirmed 'fcm_tokens' collection
        const snapshot = await db.collection('fcm_tokens').get();
        const tokens = snapshot.docs.map(doc => doc.data().token).filter(t => t);

        if (tokens.length === 0) {
            return res.status(200).json({ success: true, sentCount: 0 });
        }

        // 2. Format the payload for Native-style delivery
        // Line 23: Enhanced priority message object
        const message = {
            notification: { 
                title, 
                body,
                // Using absolute URL ensures the icon loads even when the browser is closed
                icon: 'https://weather-alert-7a801.vercel.app/logo192.png' 
            },
            
            // --- ANDROID NATIVE SETTINGS ---
            android: {
                priority: 'high', // Wakes the device from deep sleep
                notification: {
                    channelId: 'weather_alerts',
                    priority: 'max',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    // Use the logo for the small status bar icon
                    icon: 'stock_ticker_update' 
                }
            },
            
            // --- WEB PUSH SETTINGS (Chrome/Mobile Safari) ---
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    requireInteraction: true, // Native behavior: stays until clicked
                    badge: 'https://weather-alert-7a801.vercel.app/logo192.png',
                    vibrate: [200, 100, 200] // Native vibration pattern
                }
            },
            
            tokens: tokens,
        };

        // 3. Broadcast to all mobile devices
        const response = await messaging.sendEachForMulticast(message);

        // Line 57: Log individual failures for debugging if needed
        if (response.failureCount > 0) {
            console.log(`Failed to send to ${response.failureCount} stale devices.`);
        }

        return res.status(200).json({ 
            success: true, 
            sentCount: response.successCount 
        });

    } catch (error) {
        console.error("Line 68: Broadcast Execution Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}