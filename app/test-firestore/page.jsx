"use client";

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function TestFirestore() {

  const [status, setStatus] = useState("");

  async function testar() {

    try {

      console.log("DB OBJETO:", db);

      const ref = collection(db, "products");

      console.log("ANTES DO ADDDOC");

      const docRef = await addDoc(ref, {
        debug: true,
        createdAt: Date.now()
      });

      console.log("DEPOIS DO ADDDOC:", docRef.id);

      setStatus("✔ FUNCIONOU: " + docRef.id);

    } catch (err) {

      console.log("ERRO FIREBASE:", err);

      setStatus("❌ ERRO: " + err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>TESTE FIRESTORE</h1>

      <button
        onClick={testar}
        style={{ padding: 10, background: "green", color: "#fff" }}
      >
        TESTAR FIREBASE
      </button>

      <p>{status}</p>
    </div>
  );
}