import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsQTVcQNFtkesXly_Yyi0eUp-n8Ed6KL4",
  authDomain: "festaemtopo.firebaseapp.com",
  projectId: "festaemtopo",
  storageBucket: "festaemtopo.appspot.com",
  messagingSenderId: "439843522154",
  appId: "1:439843522154:web:b8b71ab37f8b433e45ac13"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);