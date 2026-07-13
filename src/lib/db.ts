import { adminFirestore } from './firebase-admin';

if (!adminFirestore) {
  console.warn("Firestore is not initialized. Database operations will fail.");
}

// A proxy stub to prevent crashes during Next.js static prerendering (build phase)
// when Firebase Admin credentials are not injected.
const stubFirestore = new Proxy({}, {
  get: (target, prop) => {
    if (['collection', 'doc', 'limit', 'where', 'orderBy'].includes(prop as string)) {
      return () => stubFirestore;
    }
    if (prop === 'get') {
      return async () => ({ empty: true, exists: false, docs: [], data: () => null });
    }
    if (['set', 'update', 'delete'].includes(prop as string)) {
      return async () => {};
    }
    return undefined;
  }
});

// Export the firestore instance as db. 
// Note: All queries must be rewritten to use Firestore syntax (e.g. db.collection('...').get())
export const db = (adminFirestore || stubFirestore) as FirebaseFirestore.Firestore;
