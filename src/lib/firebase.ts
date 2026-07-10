import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD-6xLGxfq523vQu_ComhAzg5KGECaSlMg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hotel-vantage.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hotel-vantage",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hotel-vantage.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "716338072735",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:716338072735:web:14594ed9f0eea0e592e6aa",
};

// Initialize Firebase for Client-side
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const clientAuth = getAuth(app);
export const clientStore = getFirestore(app);
