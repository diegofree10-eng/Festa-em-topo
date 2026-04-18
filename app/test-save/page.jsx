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
    <div style={styles.page}>

      {/* 🔥 HEADER */}
      <div style={styles.header}>
        <input placeholder="Buscar..." style={styles.input} />
      </div>

      {/* 🔥 INSTAGRAM (NOVO) */}
      <div style={styles.instaBox}>
        <a
          href="https://www.instagram.com/festaemtopo?utm_source=qr&igsh=eDJtOHd1aDQyYTk0"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.instaLink}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png"
            style={styles.instaIcon}
          />
          <span>@festaemtopo</span>
        </a>
      </div>

      {/* 🔥 BOTÃO TESTE */}
      <div style={{ padding: 30 }}>
        <button onClick={salvar}>
          TESTAR SALVAMENTO
        </button>

        <p>{status}</p>
      </div>

    </div>
  );
}

const styles = {

  page: {
    minHeight: "100vh",
    background: "#f5f7fb"
  },

  header: {
    padding: 20,
    display: "flex",
    justifyContent: "center"
  },

  input: {
    width: 300,
    padding: 10
  },

  /* 🔥 INSTAGRAM */
  instaBox: {
    display: "flex",
    justifyContent: "center",
    marginTop: -10,
    marginBottom: 10
  },

  instaLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    background: "#fff",
    padding: "8px 14px",
    borderRadius: 30,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    color: "#333",
    fontWeight: "bold"
  },

  instaIcon: {
    width: 22,
    height: 22
  }

};