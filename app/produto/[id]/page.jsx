"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

export default function ProdutoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [produto, setProduto] = useState(null);
  const [imgAtiva, setImgAtiva] = useState("");

  useEffect(() => {
    async function load() {
      const ref = doc(db, "produtos", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setProduto(data);
        setImgAtiva(data.capa);
      }
    }

    if (id) load();
  }, [id]);

  if (!produto) {
    return <div style={styles.loading}>Carregando...</div>;
  }

  return (
    <div style={styles.page}>

      <div style={styles.container}>

        {/* 🔙 BOTÃO VOLTAR */}
        <button
          onClick={() => router.push("/")}
          style={styles.backBtn}
        >
          ← Voltar para produtos
        </button>

        {/* 🔥 IMAGEM PRINCIPAL (CORRIGIDA) */}
        <div 
        style={{
    width: 400,
    height: 400,
    background: "#fff", // só mudou isso
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }}
>
  <img
    src={imgAtiva}
    onLoad={() => console.log("IMAGEM CARREGOU:", imgAtiva)}
    style={{
      width: "100%",
      height: "100%",
      objectFit: "contain", // NÃO MEXI (mantém como estava funcionando)
      border: "none",       // remove borda amarela
      background: "transparent"
    }}
  />
        </div>

        {/* 🔥 THUMBS */}
        <div style={styles.thumbs}>
          {produto.imagens?.map((img, i) => (
            <div key={i} style={styles.thumbBox}>
              <img
                src={img}
                onClick={() => setImgAtiva(img)}
                style={styles.thumb}
              />
            </div>
          ))}
        </div>

        {/* 🔥 INFO */}
        <div style={styles.info}>
          <h1>{produto.nome}</h1>

          <h2 style={styles.price}>
            R$ {produto.preco}
          </h2>

          <p style={styles.desc}>
            {produto.descricao}
          </p>

          <button
            onClick={() => {
              addToCart({
                id,
                nome: produto.nome,
                preco: produto.preco,
                capa: produto.capa
              });

              router.push("/carrinho");
            }}
            style={styles.button}
          >
            Adicionar ao carrinho
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {

  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    display: "flex",
    justifyContent: "center",
    padding: 20
  },

  container: {
    width: "100%",
    maxWidth: 650,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 15
  },

  backBtn: {
    alignSelf: "flex-start",
    padding: 8,
    border: "none",
    background: "transparent",
    color: "#05ad83",
    cursor: "pointer",
    fontSize: 14
  },

  // 🔥 QUADRO CORRIGIDO
  imageBox: {
    width: 400,
    height: 400,
    background: "#fff", // branco
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: "none" // sem borda
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  },

  thumbs: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
    maxWidth: 400
  },

  thumbBox: {
    width: 65,
    height: 65,
    overflow: "hidden",
    borderRadius: 8,
    border: "1px solid #ddd"
  },

  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    cursor: "pointer"
  },

  info: {
    textAlign: "center",
    maxWidth: 400
  },

  price: {
    color: "#2ecc71"
  },

  desc: {
    color: "#555",
    marginTop: 10
  },

  button: {
    marginTop: 15,
    width: "100%",
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#2ecc71",
    color: "#fff",
    cursor: "pointer"
  },

  loading: {
    textAlign: "center",
    marginTop: 50
  }
};