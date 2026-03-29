import { db, messaging } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, body } = req.body;
    
    // Fetch all registered device tokens [cite: 11]
    const snapshot = await db.collection('fcm_tokens').get();
    const tokens = snapshot.docs.map(doc => doc.data().token).filter(t => t);

    if (tokens.length === 0) return res.status(200).json({ success: true, sentCount: 0 });

    // High-priority multicast for background delivery [cite: 13]
    const message = {
      notification: { 
        title, 
        body,
        icon: 'https://weather-alert-7a801.vercel.app/logo192.png'
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: { requireInteraction: true }
      },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    return res.status(200).json({ success: true, sentCount: response.successCount });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}