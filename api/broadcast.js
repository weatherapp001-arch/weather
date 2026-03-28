import { db, messaging, auth } from './lib/firebaseAdmin.js';

const ADMIN_UID = "eurBOkHyrMMbeti2vzGKPpqFDO13"; 

export default async function handler(req, res) {
  // Always set content-type to JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'No token' });

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    // Skip UID check ONLY if testing on localhost
    const isLocal = req.headers.host.includes('localhost');
    if (decodedToken.uid !== ADMIN_UID && !isLocal) {
      return res.status(403).json({ success: false, error: 'Not Admin' });
    }

    const { title, body } = req.body;
    const snapshot = await db.collection('fcm_tokens').get();
    const tokens = snapshot.docs.map(doc => doc.data().token).filter(t => t);

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, sentCount: 0 });
    }

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    return res.status(200).json({ 
      success: true, 
      sentCount: response.successCount 
    });

  } catch (error) {
    console.error(error);
    // CRITICAL: Always return JSON here to prevent "Unexpected end of JSON"
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}