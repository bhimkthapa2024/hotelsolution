import { adminFirestore } from './firebase-admin';

if (!adminFirestore) {
  console.warn("Firestore is not initialized. Database operations will fail.");
}

// Export the firestore instance as db. 
// Note: All queries must be rewritten to use Firestore syntax (e.g. db.collection('...').get())
export const db = adminFirestore as FirebaseFirestore.Firestore;
