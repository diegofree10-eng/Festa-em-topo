// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth"; 
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CONFIGURAÇÃO CRÍTICA: ignoreUndefinedProperties impede erros ao salvar campos vazios
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED // Útil para painéis administrativos com muitos dados
});

export const auth = getAuth(app);

// 🔒 SEGURANÇA: Força a sessão a expirar quando o navegador for fechado
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Erro ao definir persistência de sessão:", error);
});

export const storage = getStorage(app);