import admin from 'firebase-admin';

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && clientEmail && privateKey) {
    try {
      // Handle both literal '\\n' and actual newlines
      const formattedKey = privateKey.includes('\\n') 
        ? privateKey.replace(/\\n/g, '\n') 
        : privateKey;
        
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log('[firebase-admin] Successfully initialized.');
    } catch (error) {
      console.error('[firebase-admin] Failed to initialize:', error);
    }
  } else {
    // Stub for local dev without credentials
    console.warn('[firebase-admin] Missing credentials — running in stub mode.');
  }
}

export const adminAuth  = admin.apps.length ? admin.auth()      : null;
export const adminFirestore = admin.apps.length ? admin.firestore() : null;
