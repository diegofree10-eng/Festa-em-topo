// lib.firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDsQTVcQNFtkesXly_Yyi0eUp-n8Ed6KL4",
  authDomain: "festaemtopo.firebaseapp.com",
  projectId: "festaemtopo",
  storageBucket: "festaemtopo.firebasestorage.app",
  messagingSenderId: "439843522154",
  appId: "1:439843522154:web:b8b71ab37f8b433e45ac13"
};

// 🔥 evita múltiplas inicializações no Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore único e compartilhado
export const db = getFirestore(app);