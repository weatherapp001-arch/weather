// Line 1: Import the Firebase Admin SDK
import admin from 'firebase-admin';

// Line 4: Initialize Firebase Admin with error handling for the Env Variable
// Make sure FIREBASE_SERVICE_ACCOUNT is added to Vercel/Env settings
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        console.error("Line 12: Failed to parse Service Account JSON:", error);
    }
}

// Line 17: Primary handler for sending weather alerts
export default async function handler(req, res) {
    // Line 19: Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { token, title, body, weatherData } = req.body;

    // Line 25: Basic validation to prevent API crashes
    if (!token || !title || !body) {
        return res.status(400).json({ error: 'Missing token, title, or body' });
    }

    // Line 30: Construct the FCM message using the modern HTTP v1 format
    const message = {
        notification: {
            title: title,
            body: body,
        },
        // Optional: Include weather metadata for the app to use
        data: {
            city: weatherData?.city || 'Unknown',
            severity: weatherData?.severity || 'Normal',
            timestamp: new Date().toISOString(),
        },
        token: token,
    };

    try {
        // Line 46: Send the notification
        const response = await admin.messaging().send(message);
        return res.status(200).json({ 
            success: true, 
            messageId: response 
        });
    } catch (error) {
        // Line 53: Log error and return failure status
        console.error("Line 54: FCM send error:", error);
        return res.status(500).json({ 
            error: 'Failed to send notification', 
            details: error.message 
        });
    }
}