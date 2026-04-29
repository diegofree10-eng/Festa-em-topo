"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, onSnapshot, orderBy, doc, addDoc 
} from "firebase/firestore";
import { useCart } from "@/app/context/CartContext";

export default function CatalogoPublico() {
  const params = useParams();
  const router = useRouter();
  const slugDaUrl = params.lojista as string;

  const [lojistaId, setLojistaId] = useState<string | null>(null);
  const [dadosLoja, setDadosLoja] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  
  const [status, setStatus] = useState<"carregando" | "erro" | "pronto">("carregando");
  const [search, setSearch] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [isMobile, setIsMobile] = useState(false);
  const [lojaAberta, setLojaAberta] = useState(true);

  const { cart } = useCart();
  const cartCount = cart?.reduce((sum, item) => sum + item.qty, 0) || 0;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!slugDaUrl) return;
    async function inicializar() {
      try {
        const qLojista = query(collection(db, "lojistas"), where("slug", "==", slugDaUrl.toLowerCase()));
        const snapLojista = await getDocs(qLojista);
        if (snapLojista.empty) { setStatus("erro"); return; }

        const docLojista = snapLojista.docs[0];
        const uid = docLojista.id;
        setLojistaId(uid);
        setDadosLoja(docLojista.data());

        onSnapshot(doc(db, "lojistas", uid, "config", "loja"), (snap) => {
          if (snap.exists()) setLojaAberta(snap.data().lojaAberta ?? true);
        });

        const qProd = query(
          collection(db, "lojistas", uid, "produtos"),
          where("ativo", "==", true),
          orderBy("createdAt", "desc")
        );
        onSnapshot(qProd, (snap) => {
          const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setProdutos(prods);
          const cats = Array.from(new Set(prods.map((p: any) => p.categoria).filter(Boolean)));
          setCategorias(cats as string[]);
          setStatus("pronto");
        });
      } catch (e) { setStatus("erro"); }
    }
    inicializar();
  }, [slugDaUrl]);

  const handleDenunciar = async () => {
    const motivo = prompt("Por favor, descreva o problema encontrado neste catálogo:");
    if (!motivo) return;
    try {
      await addDoc(collection(db, "denuncias"), {
        lojistaId, slugLoja: slugDaUrl, nomeLoja: dadosLoja?.nomeLoja || slugDaUrl,
        motivo, status: "pendente", createdAt: Date.now(), tipo: "GERAL_LOJA"
      });
      alert("Denúncia enviada com sucesso.");
    } catch (error) { alert("Erro ao enviar denúncia."); }
  };

  const normalize = (text: string) => (text || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const produtosFiltrados = produtos.filter((p) => {
    const matchSearch = normalize(p.nome).includes(normalize(search));
    const matchCat = categoriaAtiva === "todos" || normalize(p.categoria) === normalize(categoriaAtiva);
    return matchSearch && matchCat;
  });

  if (status === "carregando") return <div style={styles.center}>Carregando vitrine...</div>;
  if (status === "erro") return <div style={styles.center}>Loja não encontrada.</div>;

  return (
    <div style={{...styles.page, overflowX: 'hidden'}}>
      {!lojaAberta && (
        <div style={styles.closedBar}>🚩 No momento estamos em recesso. Apenas visualização disponível.</div>
      )}

      <header style={styles.header}>
        <div style={styles.headerContainer}>
          {/* Logo Quadrada e Maior à Esquerda */}
          <div style={styles.brandWrapper} onClick={() => router.push(`/${slugDaUrl}`)}>
            <img src={dadosLoja?.logoUrl || "/logo.png"} style={styles.logoTopSquare} alt="Logo" />
            <span style={styles.brandNameText}>{dadosLoja?.nomeLoja || slugDaUrl}</span>
          </div>

          {/* Busca Centralizada */}
          <div style={styles.searchWrapperPC}>
              <input 
                placeholder="O que você precisa hoje?" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={styles.searchInputCenter} 
              />
          </div>

          {/* Carrinho à Direita */}
          <div style={styles.headerRight}>
            <button style={styles.cartBtn} onClick={() => router.push(`/${slugDaUrl}/carrinho`)}>
                🛒 {isMobile ? `(${cartCount})` : `Carrinho (${cartCount})`}
            </button>
          </div>
        </div>
      </header>

      {/* Barra de Categorias e Instagram abaixo do Carrinho */}
      <div style={styles.categoryBar}>
        <div style={styles.categoryContent}>
            {/* Categorias Dinâmicas (Admin) */}
            <div style={styles.categoryList}>
              <button 
                onClick={() => setCategoriaAtiva("todos")} 
                style={{...styles.categoryBtn, background: categoriaAtiva === "todos" ? "#2ecc71" : "#fff", color: categoriaAtiva === "todos" ? "#fff" : "#333"}}
              >TODOS</button>
              {categorias.map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setCategoriaAtiva(cat)} 
                  style={{...styles.categoryBtn, background: normalize(categoriaAtiva) === normalize(cat) ? "#2ecc71" : "#fff", color: normalize(categoriaAtiva) === normalize(cat) ? "#fff" : "#333"}}
                >{cat.toUpperCase()}</button>
              ))}
            </div>

            {/* Instagram Link posicionado abaixo do botão verde do carrinho */}
            <div style={styles.socialInfoRight}>
               {dadosLoja?.instagram && (
                 <a 
                   href={`https://instagram.com/${dadosLoja.instagram.replace('@', '')}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style={styles.instaAnchor}
                 >
                   <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" style={styles.instaIcon} alt="Instagram" />
                   <span style={styles.brandInstaText}>@{dadosLoja.instagram.replace('@', '')}</span>
                 </a>
               )}
            </div>
        </div>
      </div>

      <main style={{...styles.grid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)'}}>
        {produtosFiltrados.map((p) => (
          <div key={p.id} style={styles.card} onClick={() => router.push(`/produto/${p.id}`)}>
            <div style={styles.imgWrapper}><img src={p.capa} style={{...styles.img, height: isMobile ? 150 : 180}} alt={p.nome} /></div>
            <div style={styles.info}>
              <h3 style={styles.productName}>{p.nome}</h3>
              <div style={styles.priceValue}>R$ {p.precoBasico || p.preco}</div>
              <button style={styles.viewBtn}>Ver Detalhes</button>
            </div>
          </div>
        ))}
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>© {dadosLoja?.nomeLoja || slugDaUrl} - Todos os direitos reservados</p>
        <button onClick={handleDenunciar} style={styles.reportBtn}>
          🚩 Denunciar este catálogo por conteúdo impróprio
        </button>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' },
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif" },
  closedBar: { background: "#e74c3c", color: "#fff", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "14px", position: "sticky", top: 0, zIndex: 2001 },
  
  header: { position: "sticky", top: 0, zIndex: 1000, background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: '12px 0' },
  headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' },
  
  brandWrapper: { display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' },
  logoTopSquare: { height: '85px', width: '85px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' },
  brandNameText: { fontWeight: 'bold', fontSize: '20px', color: '#334155' },

  searchWrapperPC: { flex: 1, maxWidth: '450px', margin: '0 20px' },
  searchInputCenter: { width: "100%", padding: "12px 20px", borderRadius: "20px", border: "1px solid #e2e8f0", background: '#f8fafc', textAlign: 'center', outline: 'none' },
  
  headerRight: { display: 'flex', alignItems: 'center' },
  cartBtn: { background: "#2ecc71", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "25px", fontWeight: "bold", cursor: "pointer", fontSize: '14px' },

  categoryBar: { background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "10px 0" },
  categoryContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' },
  categoryList: { display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, justifyContent: 'center' },
  
  socialInfoRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '150px' },
  instaAnchor: { display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' },
  instaIcon: { height: '18px', width: '18px' },
  brandInstaText: { fontSize: '13px', color: '#E1306C', fontWeight: 'bold' },

  categoryBtn: { border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap" },

  grid: { display: "grid", gap: '15px', padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: 'pointer' },
  imgWrapper: { background: '#f1f5f9' },
  img: { width: "100%", objectFit: "cover" },
  info: { padding: "10px", textAlign: "center" },
  productName: { color: "#334155", fontSize: '13px', fontWeight: '600', height: '32px', overflow: 'hidden' },
  priceValue: { color: "#2ecc71", fontWeight: "800", fontSize: '18px', margin: '8px 0' },
  viewBtn: { background: "#f1f5f9", color: "#64748b", border: "none", padding: "8px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", width: "100%" },

  footer: { padding: '40px 20px', textAlign: 'center', borderTop: '1px solid #e2e8f0', marginTop: '40px' },
  footerText: { color: '#64748b', fontSize: '13px', marginBottom: '10px' },
  reportBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' }
};