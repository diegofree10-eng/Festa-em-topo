"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc,
  getDoc
} from "firebase/firestore";

export default function Admin() {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");

  const [files, setFiles] = useState([]);
  const [imagens, setImagens] = useState([]);

  const [produtos, setProdutos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 🚚 frete
  const [frete, setFrete] = useState("");

  const colRef = collection(db, "produtos");

  // 📦 carregar produtos
  async function carregar() {
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    setProdutos(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }))
    );
  }

  // 🚚 carregar frete
  async function carregarFrete() {
    const ref = doc(db, "config", "loja");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setFrete(String(snap.data().frete ?? ""));
    }
  }

  useEffect(() => {
    carregar();
    carregarFrete();
  }, []);

  // 💾 salvar frete
  async function salvarFrete() {
    await setDoc(doc(db, "config", "loja"), {
      frete: Number(frete || 0)
    });

    alert("Frete atualizado!");
  }

  // 💰 preço formatado
  function handlePreco(e) {
    let value = e.target.value.replace(/\D/g, "");
    value = (Number(value) / 100).toFixed(2);
    setPreco(value.replace(".", ","));
  }

  // 📸 arquivos
  function handleFiles(e) {
    const selected = Array.from(e.target.files);

    if (selected.length > 4) {
      alert("Máximo 4 imagens");
      return;
    }

    for (let f of selected) {
      if (f.size > 2 * 1024 * 1024) {
        alert("Cada imagem até 2MB");
        return;
      }
    }

    setFiles(selected);
  }

  // ☁️ upload
  async function uploadImages() {
    if (!files.length) return;

    setUploading(true);

    const urls = [];

    for (let file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "eep2qiix");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dbzydexo2/image/upload",
        { method: "POST", body: formData }
      );

      const data = await res.json();
      urls.push(data.secure_url);
    }

    setImagens(urls);
    setUploading(false);
  }

  // 💾 salvar produto
  async function salvar() {
    if (!nome || !preco || !descricao) return;

    setLoading(true);

    await addDoc(colRef, {
      nome,
      preco,
      descricao,
      imagens,
      capa: imagens.length > 0 ? imagens[0] : "",
      createdAt: Date.now()
    });

    setNome("");
    setPreco("");
    setDescricao("");
    setFiles([]);
    setImagens([]);

    carregar();
    setLoading(false);
  }

  async function remover(id) {
    await deleteDoc(doc(db, "produtos", id));
    carregar();
  }

  return (
    <div style={styles.page}>

      {/* FORM */}
      <div style={styles.card}>

        <h1>📦 Cadastro de Produtos</h1>

        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Preço (15,99)"
          value={preco}
          onChange={handlePreco}
          style={styles.input}
        />

        <textarea
          placeholder="Descrição do produto"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={styles.textarea}
        />

        <input type="file" multiple accept="image/*" onChange={handleFiles} />

        <button onClick={uploadImages} style={styles.btnBlue}>
          {uploading ? "Enviando imagens..." : "Carregar imagens"}
        </button>

        <div style={styles.previewGrid}>
          {imagens.map((img, i) => (
            <img key={i} src={img} style={styles.previewImg} />
          ))}
        </div>

        <button onClick={salvar} style={styles.btnGreen}>
          {loading ? "Salvando..." : "Salvar produto"}
        </button>

        {/* 🚚 FRETE */}
        <hr style={{ margin: "20px 0" }} />

        <h3>🚚 Frete da loja</h3>

        <input
          placeholder="Ex: 12.90"
          value={frete}
          onChange={(e) => setFrete(e.target.value)}
          style={styles.input}
        />

        <button onClick={salvarFrete} style={styles.btnBlue}>
          Salvar frete
        </button>

      </div>

      {/* LISTA */}
      <div style={styles.list}>

        <h2>Produtos</h2>

        <div style={styles.grid}>
          {produtos.map((p) => (
            <div key={p.id} style={styles.cardProduct}>

              <div style={styles.imageGrid}>
                {p.imagens?.map((img, i) => (
                  <img key={i} src={img} style={styles.productImg} />
                ))}
              </div>

              <div style={{ marginTop: 8 }}>
                <strong>{p.nome}</strong>
                <p style={{ margin: 0 }}>R$ {p.preco}</p>
                <p style={styles.desc}>{p.descricao}</p>
              </div>

              <button onClick={() => remover(p.id)} style={styles.btnDelete}>
                Excluir
              </button>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

/* ✅ FIX FINAL — ISSO ESTAVA FALTANDO */
const styles = {
  page: {
    display: "flex",
    gap: 20,
    padding: 20,
    background: "#f5f7fb",
    minHeight: "100vh"
  },

  card: {
    width: "35%",
    background: "#fff",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
  },

  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ddd"
  },

  textarea: {
    width: "100%",
    padding: 10,
    height: 80,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    resize: "none"
  },

  btnBlue: {
    background: "#3498db",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    border: "none",
    marginTop: 10,
    cursor: "pointer"
  },

  btnGreen: {
    background: "#2ecc71",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    border: "none",
    marginTop: 10,
    cursor: "pointer",
    width: "100%"
  },

  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 5,
    marginTop: 10
  },

  previewImg: {
    width: "100%",
    height: 80,
    objectFit: "cover",
    borderRadius: 8
  },

  list: {
    width: "65%"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12
  },

  cardProduct: {
    background: "#fff",
    padding: 10,
    borderRadius: 12,
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)"
  },

  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 4
  },

  productImg: {
    width: "100%",
    height: 80,
    objectFit: "cover",
    borderRadius: 6
  },

  desc: {
    fontSize: 12,
    color: "#666",
    marginTop: 5
  },

  btnDelete: {
    marginTop: 8,
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    padding: 6,
    borderRadius: 6,
    cursor: "pointer",
    width: "100%"
  }
};