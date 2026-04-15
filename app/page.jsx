"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { cart } = useCart();

  // 🔥 BANNER DINÂMICO
  const mensagens = [
    "Produtos personalizados e entrega rápida",
    "🔥 Descontos especiais toda semana",
    "📦 Enviamos para todo o Brasil",
    "💚 Qualidade e preço justo"
  ];

  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % mensagens.length);
        setFade(true);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      const q = query(collection(db, "produtos"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      setProdutos(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      );
    }

    load();
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const filtered = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>

      {/* 🔥 HEADER */}
      <header style={styles.header}>

        <div style={styles.logoArea}>
          <div style={styles.logoBox}>
            <img src="/logo.png" style={styles.logo} />
          </div>
        </div>

        <div style={styles.searchBox}>
          <input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <button
          style={styles.cartBtn}
          onClick={() => router.push("/carrinho")}
        >
          🛒 Comprar ({cartCount})
        </button>

      </header>

      {/* 🔥 BANNER ESTÁVEL (SEM PULAR) */}
      <div style={styles.stripBanner}>
        <div
          style={{
            ...styles.bannerText,
            opacity: fade ? 1 : 0
          }}
        >
          {mensagens[msgIndex]}
        </div>
      </div>

      {/* 🔥 GRID */}
      <main style={styles.grid}>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={styles.card}
            onClick={() => router.push(`/produto/${p.id}`)}
          >

            <div style={styles.imgBox}>
              <img src={p.capa} style={styles.img} />
            </div>

            <div style={styles.info}>
              <h3 style={styles.name}>{p.nome}</h3>
              <p style={styles.price}>R$ {p.preco}</p>
            </div>

          </div>
        ))}
      </main>

    </div>
  );
}

const styles = {

  page: {
    background: "#f5f7fb",
    minHeight: "100vh"
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  },

  logoArea: {
    display: "flex",
    alignItems: "center"
  },

  logoBox: {
    width: 150,
    height: 150,
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid #eee",
    background: "#fff"
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },

  searchBox: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "0 10px"
  },

  searchInput: {
    width: "100%",
    maxWidth: 400,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none"
  },

  cartBtn: {
    background: "#2ecc71",
    color: "#fff",
    border: "none",
    padding: "12px 30px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold"
  },

  /* 🔥 BANNER FIXO ESTÁVEL */
  stripBanner: {
    width: "100%",
    height: 48, // 🔥 FIXO (NUNCA MUDA)
    background: "linear-gradient(90deg, #2ecc71, #27ae60)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    overflow: "hidden"
  },

  bannerText: {
    transition: "opacity 0.3s ease"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: 12,
    padding: 15
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    cursor: "pointer",
    boxShadow: "0 5px 15px rgba(0,0,0,0.06)"
  },

  imgBox: {
    width: "100%",
    height: 150,
    background: "#eee"
  },

  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },

  info: {
    padding: 10
  },

  name: {
    fontSize: 14,
    margin: 0
  },

  price: {
    marginTop: 5,
    color: "#2ecc71",
    fontWeight: "bold"
  }
};