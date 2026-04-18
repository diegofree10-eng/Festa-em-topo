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
  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();
  const { cart } = useCart();
  
  const trackRef = useRef(null);
  const positionRef = useRef(0);
  const widthRef = useRef(0);
  const rafRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      } catch (err) { console.error(err); }
    }
    loadData();
  }, []);

  const destaques = produtos.filter((p) => p.destaque && p.capa);

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

  const cartCount = cart?.reduce((sum, item) => sum + item.qty, 0) || 0;

  const normalize = (text) => (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const produtosFiltrados = produtos.filter((p) => {
    const nome = normalize(p.nome);
    const termoBusca = normalize(search);
    const matchSearch = nome.includes(termoBusca);
    const catProduto = normalize(p.categoria);
    const catFiltro = normalize(categoriaAtiva);
    return (catFiltro === "todos" || catProduto === catFiltro) && matchSearch;
  });

  return (
    <div style={{...styles.page, overflowX: 'hidden'}}>
      {!lojaAberta && (
        <div style={styles.closedBar}>🚩 No momento estamos em recesso. Apenas visualização disponível.</div>
      )}

      {/* HEADER */}
      <header style={{...styles.header, height: isMobile ? 'auto' : 80, flexDirection: 'column', padding: isMobile ? '10px' : '0 16px'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: isMobile ? 60 : 80 }}>
          <div style={{ cursor: "pointer", display: 'flex', alignItems: 'center', height: '100%', position: 'relative', width: isMobile ? 120 : 200 }} onClick={() => router.push("/")}>
            <img src="/logo.png" style={{ height: isMobile ? 50 : 120, width: 'auto', position: isMobile ? 'static' : 'absolute', top: isMobile ? '0' : 62.5, transform: isMobile ? 'none' : 'translateY(-50%)' }} alt="Logo" />
          </div>
          {!isMobile && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
               <input placeholder="O que você precisa hoje?" value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: isMobile ? 'auto' : 200, justifyContent: 'flex-end' }}>
            {isMobile && (
              <a href="https://www.instagram.com/festaemtopo" target="_blank" rel="noopener noreferrer">
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" style={{width: 28, height: 28}} alt="Instagram" />
              </a>
            )}
            <button style={styles.cartBtn} onClick={() => router.push("/carrinho")}>🛒 ({cartCount})</button>
          </div>
        </div>
        {isMobile && (
          <div style={{ width: '100%', padding: '5px 0' }}>
            <input placeholder="O que você precisa hoje?" value={search} onChange={(e) => setSearch(e.target.value)} style={{...styles.searchInput, maxWidth: 'none'}} />
          </div>
        )}
      </header>

      {/* CATEGORIAS */}
      <div style={{ ...styles.categoryBar, top: isMobile ? (lojaAberta ? 122 : 162) : (lojaAberta ? 80 : 120) }}>
        <div style={styles.categoryLeft}>
          <button onClick={() => setCategoriaAtiva("todos")} style={{...styles.categoryBtn, background: categoriaAtiva === "todos" ? "#2ecc71" : "#fff", color: categoriaAtiva === "todos" ? "#fff" : "#333"}}>TODOS</button>
          {categorias.map((cat) => (
            <button key={cat} onClick={() => setCategoriaAtiva(cat)} style={{...styles.categoryBtn, background: normalize(categoriaAtiva) === normalize(cat) ? "#2ecc71" : "#fff", color: normalize(categoriaAtiva) === normalize(cat) ? "#fff" : "#333"}}>{cat.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* BANNER */}
      <div style={{...styles.stripBanner, top: isMobile ? (lojaAberta ? 170 : 210) : (lojaAberta ? 128 : 168)}}>
        <div style={{ opacity: fade ? 1 : 0, transition: '0.3s' }}>{mensagensParaExibir[msgIndex]}</div>
      </div>

      {/* CARROSSEL - CORRIGIDO: relative no mobile para não criar buraco */}
      {destaques.length > 0 && (
        <div style={{
          ...styles.carouselFixed, 
          position: isMobile ? 'relative' : 'sticky', 
          top: isMobile ? 0 : (lojaAberta ? 172 : 212) 
        }}>
          <h2 style={styles.title}>🔥 Os Queridinhos da Semana</h2>
          <div style={styles.carouselWindow}>
            <div ref={trackRef} style={styles.carouselTrack}>
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

      {/* GRADE - AJUSTE: marginTop zerado para colar no carrossel/banner */}
      <main style={{
        ...styles.grid,
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill,minmax(180px,1fr))',
        padding: isMobile ? '10px' : '20px',
        gap: isMobile ? '10px' : '20px',
        marginTop: 10,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {produtosFiltrados.map((p) => (
          <div key={p.id} style={styles.card} onClick={() => router.push(`/produto/${p.id}`)}>
            <div style={{...styles.imgWrapper, height: isMobile ? 150 : 180}}><img src={p.capa || null} style={styles.img} alt={p.nome} /></div>
            <div style={styles.info}>
              <h3 style={{...styles.productName, fontSize: isMobile ? '12px' : '14px'}}>{p.nome}</h3>
              <div style={styles.priceContainer}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                  <span style={styles.priceLabel}>R$</span>
                  <span style={{...styles.priceValue, fontSize: isMobile ? '16px' : '20px'}}>{p.precoBasico || p.preco}</span>
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
  closedBar: { background: "#e74c3c", color: "#fff", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "14px", position: "sticky", top: 0, zIndex: 2000 },
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif", width: '100%', maxWidth: '100vw' },
  header: { position: "sticky", top: 0, zIndex: 1000, background: "#fff", display: "flex", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", width: '100%' },
  searchInput: { width: "100%", maxWidth: 420, padding: "12px 20px", borderRadius: "25px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none" },
  cartBtn: { background: "#2ecc71", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "25px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" },
  categoryBar: { position: "sticky", zIndex: 999, background: "#fff", display: "flex", justifyContent: "center", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #f1f5f9", overflowX: "auto", width: '100%' },
  categoryLeft: { display: "flex", gap: 8 },
  categoryBtn: { border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap" },
  stripBanner: { position: "sticky", height: 44, zIndex: 998, background: "#2ecc71", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "500", width: '100%' },
  carouselFixed: { width: "100%", background: "#fff", padding: "10px 0", zIndex: 997, borderBottom: "1px solid #f1f5f9" },
  title: { textAlign: "center", fontSize: "15px", color: "#1e293b", marginBottom: 8, fontWeight: "800" },
  carouselWindow: { overflow: "hidden", width: "100%" },
  carouselTrack: { display: "flex", gap: 12, width: "max-content" },
  cardCar: { width: 120, textAlign: "center", cursor: "pointer" },
  imgCar: { width: "100%", height: 90, objectFit: "cover", borderRadius: "12px" },
  nameCar: { marginTop: 4, fontSize: "10px", color: "#475569", fontWeight: "500" },
  grid: { display: "grid" },
  card: { background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" },
  imgWrapper: { position: "relative", width: "100%" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  info: { padding: "10px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  productName: { color: "#334155", marginBottom: "4px", fontWeight: "600" },
  priceContainer: { marginBottom: "8px" },
  priceLabel: { fontSize: "11px", color: "#94a3b8" },
  priceValue: { color: "#2ecc71", fontWeight: "800" },
  viewBtn: { background: "#f1f5f9", color: "#64748b", border: "none", padding: "6px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", width: "100%", cursor: "pointer" }
};