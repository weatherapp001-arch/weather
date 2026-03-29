import { db, messaging } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { title, body } = req.body;
    
    // Line 14: Fetching both FCM Tokens and Registered Emails
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

    const message = {
      notification: { 
        title, 
        body,
        icon: 'https://weather-alert-7a801.vercel.app/logo192.png' 
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'weather_alerts',
          priority: 'max',
          defaultSound: true
        }
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          requireInteraction: true,
          badge: 'https://weather-alert-7a801.vercel.app/logo192.png'
        }
      },
      tokens: tokens,
    };

    // Line 51: Sending Push (Works even if website is closed)
    const response = await messaging.sendEachForMulticast(message);

    return res.status(200).json({ 
      success: true, 
      sentCount: response.successCount,
      totalSubscribers: emails.length 
    });

  } catch (error) {
    console.error("Broadcast Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}