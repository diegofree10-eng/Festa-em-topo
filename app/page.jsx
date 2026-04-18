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
      
      {/* CAMADA DE INTELIGÊNCIA PARA CELULAR (Não altera o PC) */}
      <style jsx global>{`
        @media (max-width: 768px) {
          header { 
            height: auto !important; 
            flex-direction: column !important; 
            padding: 15px !important;
            gap: 15px !important;
          }
          .logo-box-mobile { 
            width: 100% !important; 
            justify-content: center !important;
            height: 50px !important;
          }
          .logo-img-mobile { 
            height: 70px !important; 
            position: relative !important; 
            top: 0 !important; 
            transform: none !important;
          }
          .search-box-mobile { 
            width: 100% !important; 
            order: 3; /* Busca fica por último no mobile */
          }
          .cart-box-mobile { 
            width: 100% !important; 
            justify-content: center !important;
            order: 2;
          }
          .grid-mobile {
            grid-template-columns: repeat(2, 1fr) !important; /* 2 colunas no celular */
            gap: 10px !important;
            padding: 10px !important;
          }
          .category-bar-mobile {
            top: 180px !important; /* Ajusta a posição da barra fixa no celular */
          }
          .banner-mobile {
            top: 228px !important;
          }
        }
      `}</style>

      {!lojaAberta && (
        <div style={styles.closedBar}>
          🚩 No momento estamos em recesso. Apenas visualização disponível.
        </div>
      )}

      <a href="https://wa.me/5512981654900" target="_blank" rel="noopener noreferrer" style={styles.whatsappFab}>
        <img src="https://cdn-icons-png.flaticon.com/512/3670/3670051.png" style={{width: 35}} alt="WhatsApp" />
      </a>

      <header style={styles.header}>
        <div style={styles.logoBox} className="logo-box-mobile" onClick={() => router.push("/")}>
          <img src="/logo.png" style={styles.logo} className="logo-img-mobile" alt="Logo" />
        </div>
        <div style={styles.searchBox} className="search-box-mobile">
          <input
            placeholder="O que você precisa hoje?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.cartContainer} className="cart-box-mobile">
          <button style={styles.cartBtn} onClick={() => router.push("/carrinho")}>
            🛒 ({cartCount})
          </button>
        </div>
      </header>

      <div style={styles.categoryBar} className="category-bar-mobile">
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
        <div style={styles.categoryRight}>
          <a href="https://www.instagram.com/festaemtopo" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" style={styles.instaIcon} alt="Instagram" />
          </a>
        </div>
      </div>

      <div style={styles.stripBanner} className="banner-mobile">
        <div style={{ opacity: fade ? 1 : 0, transition: '0.3s' }}>
          {mensagensParaExibir[msgIndex]}
        </div>
      </div>

      {destaques.length > 0 && (
        <div style={styles.carouselFixed}>
          <h2 style={styles.title}>🔥 Os Queridinhos da Semana</h2>
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

      <main style={styles.grid} className="grid-mobile">
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
  closedBar: { background: "#e74c3c", color: "#fff", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "14px", position: "sticky", top: 0, zIndex: 2000, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif" },
  whatsappFab: { position: "fixed", bottom: 20, right: 20, width: 60, height: 60, background: "#25d366", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", zIndex: 9999, transition: "0.3s" },
  header: { position: "sticky", top: 0, zIndex: 1000, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 80, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  logoBox: { display: "flex", alignItems: "center", height: 80, width: 200, position: "relative", cursor: "pointer" },
  logo: { height: 120, width: "auto", objectFit: "contain", position: "absolute", top: 62.5, transform: "translateY(-50%)", left: 0, zIndex: 1100 },
  searchBox: { flex: 1, display: "flex", justifyContent: "center" },
  searchInput: { width: "100%", maxWidth: 420, padding: "12px 20px", borderRadius: "25px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none", transition: "0.3s" },
  cartContainer: { width: 200, display: "flex", justifyContent: "flex-end" },
  cartBtn: { background: "#2ecc71", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "25px", cursor: "pointer", fontWeight: "bold" },
  categoryBar: { position: "sticky", top: 80, zIndex: 999, background: "#fff", display: "flex", justifyContent: "center", alignItems: "center", padding: "10px 16px", gap: 20, borderBottom: "1px solid #f1f5f9", overflowX: "auto" },
  categoryLeft: { display: "flex", gap: 10 },
  categoryBtn: { border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", transition: "0.2s" },
  categoryRight: { position: "absolute", right: 16 },
  instaIcon: { width: 26, height: 26 },
  stripBanner: { position: "sticky", top: 128, height: 44, zIndex: 998, background: "#2ecc71", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", fontWeight: "500" },
  carouselFixed: { position: "sticky", top: 172, width: "100%", background: "#fff", padding: "15px 0", zIndex: 997, borderBottom: "1px solid #f1f5f9" },
  title: { textAlign: "center", fontSize: "18px", color: "#1e293b", marginBottom: 12, fontWeight: "800" },
  carouselWindow: { overflow: "hidden", width: "100%" },
  carouselTrack: { display: "flex", gap: 14, width: "max-content" },
  cardCar: { width: 150, textAlign: "center", cursor: "pointer" },
  imgCar: { width: "100%", height: 110, objectFit: "cover", borderRadius: "12px" },
  nameCar: { marginTop: 6, fontSize: "12px", color: "#475569", fontWeight: "500" },
  grid: { marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "20px", padding: "20px" },
  card: { background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", cursor: "pointer", transition: "0.3s", display: "flex", flexDirection: "column" },
  imgWrapper: { position: "relative", width: "100%", height: 180 },
  bestSellerBadge: { position: "absolute", top: 10, left: 10, background: "#f1c40f", color: "#000", fontSize: "9px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", zIndex: 5 },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  info: { padding: "15px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  productName: { fontSize: "14px", color: "#334155", marginBottom: "8px", fontWeight: "600" },
  priceContainer: { marginBottom: "12px", display: 'flex', flexDirection: 'column', alignItems: 'center' },
  priceLabel: { fontSize: "12px", color: "#94a3b8" },
  priceValue: { fontSize: "20px", color: "#2ecc71", fontWeight: "800" },
  viewBtn: { background: "#f1f5f9", color: "#64748b", border: "none", padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", width: "100%", cursor: "pointer" }
};