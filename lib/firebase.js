// lib/firebase.js (Projeto GESTÃO)
import { initializeApp, getApps, getApp } from "firebase/app";
// Importar initializeFirestore em vez de apenas getFirestore
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; 
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
});

export const auth = getAuth(app); 
export const storage = getStorage(app);