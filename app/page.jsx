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
    "📦 Entrega em São José dos Campos e Região",
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
      <header style={{...styles.header, height: isMobile ? 'auto' : 90, padding: isMobile ? '10px' : '0 30px'}}>
        <div style={styles.headerContainer}>
          <div style={{ cursor: "pointer", display: 'flex', alignItems: 'center', zIndex: 10 }} onClick={() => router.push("/")}>
            <img src="/logo.png" style={{ height: isMobile ? 45 : 65, width: 'auto' }} alt="Logo" />
          </div>

          {!isMobile && (
            <div style={styles.searchWrapperPC}>
               <input 
                placeholder="O que você precisa hoje?" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={styles.searchInputCenter} 
               />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20, zIndex: 10 }}>
            <a href="https://www.instagram.com/festaemtopo" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" style={{width: 24, height: 24}} alt="Instagram" />
                {!isMobile && <span style={{marginLeft: 8, fontSize: '13px', color: '#E1306C', fontWeight: 'bold'}}>@festaemtopo</span>}
            </a>
            <button style={styles.cartBtn} onClick={() => router.push("/carrinho")}>
               🛒 {isMobile ? `(${cartCount})` : `Carrinho (${cartCount})`}
            </button>
          </div>
        </div>

        {isMobile && (
          <div style={{ width: '100%', padding: '8px 0 2px 0' }}>
            <input 
              placeholder="O que você precisa hoje?" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={styles.searchInputMobile} 
            />
          </div>
        )}
      </header>

      {/* CATEGORIAS CORRIGIDAS PARA SCROLL TOTAL */}
      <div style={{ ...styles.categoryBar, top: isMobile ? (lojaAberta ? 122 : 162) : (lojaAberta ? 90 : 130) }}>
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
      </div>

      {/* BANNER MENSAGEM */}
      <div style={{...styles.stripBanner, top: isMobile ? (lojaAberta ? 170 : 210) : (lojaAberta ? 138 : 178)}}>
        <div style={{ opacity: fade ? 1 : 0, transition: '0.3s' }}>{mensagensParaExibir[msgIndex]}</div>
      </div>

      {/* BOTÃO WHATSAPP */}
      <a href="https://wa.me/5512981654900" target="_blank" rel="noopener noreferrer" style={styles.whatsappFixed}>
        <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" style={{width: 35, height: 35}} alt="WhatsApp" />
      </a>

      {/* CARROSSEL DE DESTAQUES */}
      {destaques.length > 0 && (
        <div style={{
          ...styles.carouselFixed, 
          position: isMobile ? 'relative' : 'sticky', 
          top: isMobile ? 0 : (lojaAberta ? 182 : 222) 
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

      {/* GRADE DE PRODUTOS */}
      <main style={{
        ...styles.grid,
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
        padding: isMobile ? '10px' : '20px',
        gap: isMobile ? '10px' : '15px',
        maxWidth: '1400px',
        margin: '20px auto'
      }}>
        {produtosFiltrados.map((p) => (
          <div key={p.id} style={styles.card} onClick={() => router.push(`/produto/${p.id}`)}>
            <div style={{...styles.imgWrapper, height: isMobile ? 150 : 180}}>
              <img src={p.capa || null} style={styles.img} alt={p.nome} />
            </div>
            <div style={styles.info}>
              <h3 style={{...styles.productName, fontSize: isMobile ? '12px' : '13px'}}>{p.nome}</h3>
              <div style={styles.priceContainer}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                  <span style={styles.priceLabel}>R$</span>
                  <span style={{...styles.priceValue, fontSize: isMobile ? '16px' : '18px'}}>{p.precoBasico || p.preco}</span>
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
  closedBar: { background: "#e74c3c", color: "#fff", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "14px", position: "sticky", top: 0, zIndex: 2001 },
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif", width: '100%' },
  header: { position: "sticky", top: 0, zIndex: 1000, background: "#fff", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", width: '100%', justifyContent: 'center' },
  headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px', margin: '0 auto', position: 'relative' },
  searchWrapperPC: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'center' },
  searchInputCenter: { width: "100%", padding: "10px 20px", borderRadius: "20px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none", background: '#f8fafc', textAlign: 'center' },
  searchInputMobile: { width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none", background: '#f1f5f9' },
  cartBtn: { background: "#2ecc71", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "25px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" },
  categoryBar: { position: "sticky", zIndex: 999, background: "#fff", display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9", overflowX: "auto", width: '100%' },
  categoryLeft: { display: "flex", gap: 8, padding: '0 15px' },
  categoryBtn: { border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", flexShrink: 0 },
  stripBanner: { position: "sticky", height: 44, zIndex: 998, background: "#2ecc71", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "500", width: '100%' },
  whatsappFixed: { position: 'fixed', bottom: '30px', right: '30px', width: '60px', height: '60px', backgroundColor: '#25d366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 3000 },
  carouselFixed: { width: "100%", background: "#fff", padding: "15px 0", zIndex: 997, borderBottom: "1px solid #f1f5f9" },
  title: { textAlign: "center", fontSize: "15px", color: "#1e293b", marginBottom: 8, fontWeight: "800" },
  carouselWindow: { overflow: "hidden", width: "100%" },
  carouselTrack: { display: "flex", gap: 12, width: "max-content", padding: '0 15px' },
  cardCar: { width: 130, textAlign: "center", cursor: "pointer" },
  imgCar: { width: "100%", height: 100, objectFit: "cover", borderRadius: "12px" },
  nameCar: { marginTop: 4, fontSize: "11px", color: "#475569", fontWeight: "500" },
  grid: { display: "grid", width: '100%', boxSizing: 'border-box' },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", transition: '0.2s', cursor: 'pointer', height: '100%' },
  imgWrapper: { position: "relative", width: "100%" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  info: { padding: "10px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  productName: { 
    color: "#334155", 
    marginBottom: "5px", 
    fontWeight: "600", 
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  priceContainer: { marginBottom: "10px" },
  priceLabel: { fontSize: "11px", color: "#94a3b8" },
  priceValue: { color: "#2ecc71", fontWeight: "800" },
  viewBtn: { background: "#f1f5f9", color: "#64748b", border: "none", padding: "8px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", width: "100%", cursor: "pointer" }
};