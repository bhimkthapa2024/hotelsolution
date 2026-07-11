import admin from 'firebase-admin';

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Stub for local dev without credentials
    console.warn('[firebase-admin] Missing credentials — running in stub mode.');
  }
}

export const adminAuth  = admin.apps.length ? admin.auth()      : null;
export const adminFirestore = admin.apps.length ? admin.firestore() : null;
