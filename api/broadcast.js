import { db, messaging } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
  // Always set content-type to JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // --- AUTHENTICATION COMPLETELY REMOVED ---
    // We are now trusting the payload directly for simplicity

    const { title, body } = req.body;
    
    // Fetch all synced tokens from your Firestore fcm_tokens collection
    const snapshot = await db.collection('fcm_tokens').get();
    const tokens = snapshot.docs.map(doc => doc.data().token).filter(t => t);

    // If no devices are registered, just return a success with 0 count
    if (tokens.length === 0) {
      return res.status(200).json({ success: true, sentCount: 0 });
    }

    // Format the payload
   // Line 29: Format the payload for Native-style delivery
    const message = {
      notification: { 
        title, 
        body,
        icon: 'https://weather-alert-7a801.vercel.app/logo192.png' // Use absolute URL
      },
      // This tells Android/Chrome to wake up the phone immediately
      android: {
        priority: 'high',
        notification: {
          channelId: 'weather_alerts',
          priority: 'max'
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          requireInteraction: true // Keeps notification visible until clicked
        }
      },
      tokens: tokens,
    };
    // Broadcast to all devices
    const response = await messaging.sendEachForMulticast(message);

    return res.status(200).json({ 
      success: true, 
      sentCount: response.successCount 
    });

  } catch (error) {
    console.error("Broadcast Execution Error:", error);
    // Return a safe 500 JSON response so the frontend can read the exact failure
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}