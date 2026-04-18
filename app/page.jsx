"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [lojaAberta, setLojaAberta] = useState(true);
  const [avisoDestaque, setAvisoDestaque] = useState("");

  const router = useRouter();
  const { cart } = useCart();
  const trackRef = useRef(null);
  const positionRef = useRef(0);
  const widthRef = useRef(0);
  const rafRef = useRef(null);
  const pausedRef = useRef(false);

  const mensagensPadrao = [
    "✨ Transforme sua festa em um momento inesquecível!",
    "🔥 Os temas mais amados estão aqui",
    "📦 Entrega garantida em todo o Brasil",
    "💖 Papelaria afetiva com acabamento premium"
  ];

  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        setLojaAberta(dados.lojaAberta ?? true);
        setAvisoDestaque(dados.avisoDestaque || "");
      }
    });
    return () => unsub();
  }, []);

  const mensagensParaExibir = avisoDestaque ? [avisoDestaque, ...mensagensPadrao] : mensagensPadrao;

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % mensagensParaExibir.length);
        setFade(true);
      }, 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [mensagensParaExibir.length]);

  useEffect(() => {
    async function loadData() {
      try {
        const qProd = query(collection(db, "produtos"), orderBy("createdAt", "desc"));
        const snapProd = await getDocs(qProd);
        setProdutos(snapProd.docs.map((d) => ({ id: d.id, ...d.data() })));

        const qCat = collection(db, "categorias");
        const snapCat = await getDocs(qCat);
        setCategorias(snapCat.docs.map(d => d.data().nome));
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    }
    loadData();
  }, []);

  const cartCount = cart?.reduce((sum, item) => sum + item.qty, 0) || 0;
  const destaques = produtos.filter((p) => p.destaque && p.capa);

  const normalize = (text) =>
    (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const produtosFiltrados = produtos.filter((p) => {
    const nome = normalize(p.nome);
    const termoBusca = normalize(search);
    const matchSearch = nome.includes(termoBusca);
    const catProduto = normalize(p.categoria);
    const catFiltro = normalize(categoriaAtiva);
    return (catFiltro === "todos" || catProduto === catFiltro) && matchSearch;
  });

  useEffect(() => {
    const el = trackRef.current;
    if (!el || destaques.length === 0) return;
    const speed = 0.6;
    const updateWidth = () => { widthRef.current = el.scrollWidth / 2; };
    setTimeout(updateWidth, 500);
    
    const animate = () => {
      if (!pausedRef.current && widthRef.current > 0) {
        positionRef.current += speed;
        if (positionRef.current >= widthRef.current) positionRef.current = 0;
        el.style.transform = `translate3d(${-positionRef.current}px, 0, 0)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [destaques]);

  return (
    <div style={styles.page}>
      {!lojaAberta && (
        <div style={styles.closedBar}>
          🚩 No momento estamos em recesso. Apenas visualização disponível.
        </div>
      )}

      <a href="https://wa.me/5512981654900" target="_blank" rel="noopener noreferrer" style={styles.whatsappFab}>
        <img src="https://cdn-icons-png.flaticon.com/512/3670/3670051.png" style={{width: 35}} alt="WhatsApp" />
      </a>

      <header style={styles.header}>
        <div style={styles.headerTop}>
            <div style={styles.logoBox} onClick={() => router.push("/")}>
                <img src="/logo.png" style={styles.logo} alt="Logo" />
            </div>
            <div style={styles.cartContainer}>
                <button style={styles.cartBtn} onClick={() => router.push("/carrinho")}>
                    🛒 ({cartCount})
                </button>
            </div>
        </div>
        
        <div style={styles.searchBox}>
          <input
            placeholder="O que você precisa hoje?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </header>

      <div style={styles.categoryBar}>
        <div style={styles.categoryLeft}>
          <button
            onClick={() => setCategoriaAtiva("todos")}
            style={{...styles.categoryBtn, background: categoriaAtiva === "todos" ? "#2ecc71" : "#fff", color: categoriaAtiva === "todos" ? "#fff" : "#333"}}
          >
            TODOS
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              style={{...styles.categoryBtn, background: normalize(categoriaAtiva) === normalize(cat) ? "#2ecc71" : "#fff", color: normalize(categoriaAtiva) === normalize(cat) ? "#fff" : "#333"}}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Instagram agora está fora do scroll para não prender */}
        <div style={styles.categoryRight}>
          <a href="https://www.instagram.com/festaemtopo" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" style={styles.instaIcon} alt="Instagram" />
          </a>
        </div>
      </div>

      <div style={styles.stripBanner}>
        <div style={{ opacity: fade ? 1 : 0, transition: '0.3s', textAlign: 'center', padding: '0 10px' }}>
          {mensagensParaExibir[msgIndex]}
        </div>
      </div>

      {destaques.length > 0 && (
        <div style={styles.carouselFixed}>
          <h2 style={styles.title}>🔥 Os Queridinhos</h2>
          <div style={styles.carouselWindow}>
            <div ref={trackRef} style={styles.carouselTrack} onMouseEnter={() => pausedRef.current = true} onMouseLeave={() => pausedRef.current = false}>
              {[...destaques, ...destaques].map((p, i) => (
                <div key={i} style={styles.cardCar} onClick={() => router.push(`/produto/${p.id}`)}>
                  <img src={p.capa || null} style={styles.imgCar} alt={p.nome} />
                  <p style={styles.nameCar}>{p.nome}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main style={styles.grid}>
        {produtosFiltrados.map((p) => (
          <div key={p.id} style={styles.card} onClick={() => router.push(`/produto/${p.id}`)}>
            <div style={styles.imgWrapper}>
              {(p.categoria?.toLowerCase().includes("kit") || p.destaque) && (
                <div style={styles.bestSellerBadge}>MAIS VENDIDO</div>
              )}
              <img src={p.capa || null} style={styles.img} alt={p.nome} />
            </div>
            <div style={styles.info}>
              <h3 style={styles.productName}>{p.nome}</h3>
              <div style={styles.priceContainer}>
                {p.categoria === "Kit Festa" && (
                  <span style={{fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: -2}}>a partir de</span>
                )}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                  <span style={styles.priceLabel}>R$</span>
                  <span style={styles.priceValue}>{p.precoBasico || p.preco}</span>
                </div>
              </div>
              <button style={styles.viewBtn}>Ver Detalhes</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

const styles = {
  closedBar: {
    background: "#e74c3c", color: "#fff", padding: "10px", textAlign: "center",
    fontWeight: "bold", fontSize: "12px", position: "sticky", top: 0, zIndex: 3000
  },
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif" },
  whatsappFab: { 
    position: "fixed", bottom: 20, right: 20, width: 55, height: 55, 
    background: "#25d366", borderRadius: "50%", display: "flex", 
    alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    zIndex: 9999
  },
  // --- HEADER AJUSTADO PARA MOBILE ---
  header: { 
    position: "sticky", top: 0, zIndex: 2000, background: "#fff", 
    display: "flex", flexDirection: "column", padding: "10px 16px", 
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)", gap: "10px"
  },
  headerTop: {
    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%"
  },
  logoBox: { height: 50, display: "flex", alignItems: "center", cursor: "pointer" },
  logo: { height: 80, width: "auto", objectFit: "contain" }, // Logo menor no mobile
  searchBox: { width: "100%" },
  searchInput: { 
    width: "100%", padding: "10px 15px", borderRadius: "20px", 
    border: "1px solid #e2e8f0", fontSize: "14px", outline: "none" 
  },
  cartContainer: { display: "flex", alignItems: "center" },
  cartBtn: { 
    background: "#2ecc71", color: "#fff", border: "none", 
    padding: "8px 15px", borderRadius: "20px", cursor: "pointer", 
    fontWeight: "bold", fontSize: "13px" 
  },
  // --- BARRA DE CATEGORIAS AJUSTADA ---
  categoryBar: { 
    position: "sticky", top: 115, zIndex: 1999, background: "#fff", 
    display: "flex", alignItems: "center", padding: "8px 16px", 
    borderBottom: "1px solid #f1f5f9", overflow: "hidden" // Container pai não rola
  },
  categoryLeft: { 
    display: "flex", gap: 8, overflowX: "auto", paddingRight: "40px",
    scrollbarWidth: "none", WebkitOverflowScrolling: "touch", width: "100%"
  },
  categoryBtn: { 
    border: "1px solid #e2e8f0", padding: "6px 14px", borderRadius: "15px", 
    fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap" 
  },
  categoryRight: { 
    position: "absolute", right: 10, background: "rgba(255,255,255,0.9)", 
    paddingLeft: "10px", display: "flex", alignItems: "center" 
  },
  instaIcon: { width: 24, height: 24 },
  
  // --- BANNER E CARROSSEL ---
  stripBanner: { 
    position: "relative", height: 40, background: "#2ecc71", 
    display: "flex", alignItems: "center", justifyContent: "center", 
    color: "#fff", fontSize: "12px", fontWeight: "500" 
  },
  carouselFixed: { 
    width: "100%", background: "#fff", padding: "15px 0", 
    borderBottom: "1px solid #f1f5f9" 
  },
  title: { textAlign: "center", fontSize: "16px", color: "#1e293b", marginBottom: 10, fontWeight: "800" },
  carouselWindow: { overflow: "hidden", width: "100%" },
  carouselTrack: { display: "flex", gap: 12, width: "max-content" },
  cardCar: { width: 130, textAlign: "center" },
  imgCar: { width: "100%", height: 100, objectFit: "cover", borderRadius: "10px" },
  nameCar: { marginTop: 4, fontSize: "11px", color: "#475569" },
  
  // --- GRADE DE PRODUTOS ---
  grid: { 
    display: "grid", 
    gridTemplateColumns: "1fr 1fr", // Duas colunas fixas no mobile para ficar mais bonito
    gap: "12px", padding: "12px" 
  },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  imgWrapper: { position: "relative", width: "100%", height: 150 },
  bestSellerBadge: { 
    position: "absolute", top: 8, left: 8, background: "#f1c40f", 
    color: "#000", fontSize: "8px", fontWeight: "bold", padding: "3px 6px", borderRadius: "3px" 
  },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  info: { padding: "10px", textAlign: "center" },
  productName: { fontSize: "13px", color: "#334155", marginBottom: "5px", height: "32px", overflow: "hidden" },
  priceContainer: { marginBottom: "8px" },
  priceLabel: { fontSize: "10px", color: "#94a3b8" },
  priceValue: { fontSize: "16px", color: "#2ecc71", fontWeight: "800" },
  viewBtn: { background: "#f1f5f9", color: "#64748b", border: "none", padding: "6px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", width: "100%" }
};