// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth"; 
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAMA-mzlYaHif6AdfUPvBEN8tTpOgaOd4Y",
  authDomain: "gestao-12166.firebaseapp.com",
  projectId: "gestao-12166",
  storageBucket: "gestao-12166.firebasestorage.app",
  messagingSenderId: "151974066268",
  appId: "1:151974066268:web:df8f836c9200e08d314e99",
  measurementId: "G-8JTENVLVSM"
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