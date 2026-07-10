import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // In Firebase App Hosting / Cloud Build, use Application Default Credentials (ADC)
    // In local dev, use explicit service account from env vars
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      let pk = process.env.FIREBASE_PRIVATE_KEY;
      if (pk.startsWith('"') && pk.endsWith('"')) {
        pk = pk.substring(1, pk.length - 1);
      }
      pk = pk.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: pk,
        }),
      });
    } else {
      // ADC: works automatically in Google Cloud environments
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
