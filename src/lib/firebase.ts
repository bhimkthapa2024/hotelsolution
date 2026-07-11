import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCr-jxzofNmaSXdTZNCdY4UT-MzVvhO-eQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hotelsolution-94ed1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hotelsolution-94ed1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hotelsolution-94ed1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "310428411524",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:310428411524:web:placeholder",
};

// Initialize Firebase for Client-side
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const clientAuth = getAuth(app);
export const clientStore = getFirestore(app);
