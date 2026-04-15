"use client";

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function TestSave() {

  const [status, setStatus] = useState("");

  async function salvar() {
    setStatus("Enviando...");

    try {
      const ref = collection(db, "teste");

      const doc = await addDoc(ref, {
        nome: "produto teste",
        createdAt: Date.now()
      });

      setStatus("SALVO: " + doc.id);

    } catch (err) {
      console.log(err);
      setStatus("ERRO: " + err.message);
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <button onClick={salvar}>
        TESTAR SALVAMENTO
      </button>

      <p>{status}</p>
    </div>
  );
}