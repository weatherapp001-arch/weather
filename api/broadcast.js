// File: api/broadcast.js
// Function: default handler
// Line: 1-75

import { db, messaging, auth } from './lib/firebaseAdmin.js';

// Line 7: Ensure this matches your UID from the Firebase Console or console.log(auth.currentUser.uid)
const ADMIN_UID = "YOUR_ACTUAL_ADMIN_UID_HERE";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Line 15: Extract and Verify Authorization Header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Line 24: Security Check - Only the Admin can trigger a broadcast
    const decodedToken = await auth.verifyIdToken(idToken);
    if (decodedToken.uid !== ADMIN_UID) {
      return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
    }

    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Missing alert title or body' });
    }

    // Line 35: Fetch all registered device tokens
    const snapshot = await db.collection('fcm_tokens').get();
    const tokens = snapshot.docs.map(doc => doc.data().token).filter(t => t);

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, sentCount: 0, message: 'No subscribers found.' });
    }

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    // Line 48: Send Multicast to all devices
    const response = await messaging.sendEachForMulticast(message);
    
    // Line 51: AUTOMATED CLEANUP - Remove invalid tokens from Firestore
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          // Identify tokens that are no longer active
          if (errorCode === 'messaging/registration-token-not-registered' || 
              errorCode === 'messaging/invalid-registration-token') {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      // Perform a batch delete for efficiency
      if (tokensToRemove.length > 0) {
        const batch = db.batch();
        for (const token of tokensToRemove) {
          // Find the doc by the token field and queue for deletion
          const q = await db.collection('fcm_tokens').where('token', '==', token).get();
          q.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
        console.log(`Cleaned up ${tokensToRemove.length} expired tokens.`);
      }
    }

    return res.status(200).json({ 
      success: true, 
      sentCount: response.successCount,
      failureCount: response.failureCount 
    });

  } catch (error) {
    console.error("Broadcast Error Pipeline:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}