import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // 1. Parse the full JSON string from your Vercel Environment Variables
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Fix potential newline issues in the private key
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // 3. Initialize the Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error.stack);
  }
}

// Export the specific services you need for your API routes
export const db = admin.firestore();
export const messaging = admin.messaging();
export const auth = admin.auth(); // <-- ADDED THIS LINE
export default admin;