import { db, messaging } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { title, body } = req.body;
        
        // Line 14: Fetch all linked tokens and emails
        const snapshot = await db.collection('fcm_tokens').get();
        const tokens = [];
        const emails = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.token) tokens.push(data.token);
            if (data.email) emails.push(data.email);
        });

        if (tokens.length === 0) {
            return res.status(200).json({ success: true, sentCount: 0 });
        }

        // Line 28: High-Priority Payload for Background Delivery
        const message = {
            notification: { 
                title, 
                body,
                icon: 'https://weather-alert-7a801.vercel.app/logo192.png' 
            },
            android: {
                priority: 'high',
                notification: { channelId: 'weather_alerts', priority: 'max', defaultSound: true }
            },
            webpush: {
                headers: { Urgency: 'high' },
                notification: { requireInteraction: true, badge: 'https://weather-alert-7a801.vercel.app/logo192.png' }
            },
            tokens: tokens,
        };

        // Line 46: Trigger Push to all devices (Works even if website is closed)
        const response = await messaging.sendEachForMulticast(message);

        // Optional: Trigger your Email Broadcast logic here using the 'emails' array
        console.log(`Line 50: Broadcasted to ${response.successCount} devices and ${emails.length} emails.`);

        return res.status(200).json({ 
            success: true, 
            sentCount: response.successCount,
            emailCount: emails.length
        });

    } catch (error) {
        console.error("Line 60: Broadcast Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}