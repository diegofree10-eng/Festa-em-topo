"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, onSnapshot, orderBy, doc 
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

  // 1. Monitor de Responsividade
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 2. Inicialização e Listeners em Tempo Real
  useEffect(() => {
    if (!slugDaUrl) return;

    let unsubLoja: () => void;
    let unsubProds: () => void;

    async function inicializar() {
      try {
        // Busca o Lojista pelo Slug
        const qLojista = query(collection(db, "lojistas"), where("slug", "==", slugDaUrl.toLowerCase()));
        const snapLojista = await getDocs(qLojista);
        
        if (snapLojista.empty) {
          setStatus("erro");
          return;
        }

        const docLojista = snapLojista.docs[0];
        const uid = docLojista.id;
        setLojistaId(uid);
        setDadosLoja(docLojista.data());

        // Listener: Status da Loja (Aberto/Fechado)
        unsubLoja = onSnapshot(doc(db, "lojistas", uid, "config", "loja"), (snap) => {
          if (snap.exists()) setLojaAberta(snap.data().lojaAberta ?? true);
        });

        // Listener: Produtos da Subcoleção (Organizado e em Tempo Real)
        const qProd = query(
          collection(db, "lojistas", uid, "produtos"),
          where("ativo", "==", true),
          orderBy("createdAt", "desc")
        );

        unsubProds = onSnapshot(qProd, (snap) => {
          const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setProdutos(prods);
          
          // Extração única de categorias
          const cats = Array.from(new Set(prods.map((p: any) => p.categoria).filter(Boolean)));
          setCategorias(cats as string[]);
          setStatus("pronto");
        }, (err) => {
          console.error("Erro na busca de produtos:", err);
          // Se der erro de índice, ele cai aqui.
          setStatus("pronto"); // Mantém pronto para mostrar lista vazia em vez de erro travado
        });

      } catch (e) {
        console.error("Erro ao inicializar catálogo:", e);
        setStatus("erro");
      }
    }

    inicializar();

    // Limpeza (Cleanup) ao fechar a página
    return () => {
      if (unsubLoja) unsubLoja();
      if (unsubProds) unsubProds();
    };
  }, [slugDaUrl]);

  // 3. Lógica de Filtro
  const normalize = (text: string) => (text || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const produtosFiltrados = produtos.filter((p) => {
    const matchSearch = normalize(p.nome).includes(normalize(search));
    const matchCat = categoriaAtiva === "todos" || normalize(p.categoria) === normalize(categoriaAtiva);
    return matchSearch && matchCat;
  });

  if (status === "carregando") return <div style={styles.center}>Carregando catálogo...</div>;
  if (status === "erro") return <div style={styles.center}>Loja não encontrada ou link inválido.</div>;

  return (
    <div style={{...styles.page, overflowX: 'hidden'}}>
      {!lojaAberta && (
        <div style={styles.closedBar}>🚩 No momento estamos em recesso. Apenas visualização disponível.</div>
      )}

      <header style={styles.header}>
        <div style={styles.headerContainer}>
          
          <div style={isMobile ? styles.mobileTop : styles.leftFixed}>
            <div style={styles.brandWrapper} onClick={() => router.push(`/${slugDaUrl}`)}>
              <div style={styles.logoBox}>
                <img src={dadosLoja?.logoUrl || "/logo.png"} style={styles.logoImg} alt="Logo" />
              </div>
              <h1 style={styles.brandName}>{dadosLoja?.nomeLoja || slugDaUrl}</h1>
            </div>
          </div>

          <div style={styles.centerFlow}>
            <input 
              placeholder="O que você procura?" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={styles.searchInput} 
            />
            
            <div style={styles.categoryRow}>
              <button 
                onClick={() => setCategoriaAtiva("todos")} 
                style={{...styles.categoryBtn, 
                  background: categoriaAtiva === "todos" ? "#2ecc71" : "#fff", 
                  color: categoriaAtiva === "todos" ? "#fff" : "#333"}}
              >TODOS</button>
              {categorias.map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setCategoriaAtiva(cat)} 
                  style={{...styles.categoryBtn, 
                    background: normalize(categoriaAtiva) === normalize(cat) ? "#2ecc71" : "#fff", 
                    color: normalize(categoriaAtiva) === normalize(cat) ? "#fff" : "#333"}}
                >{cat.toUpperCase()}</button>
              ))}
            </div>
          </div>

          <div style={isMobile ? styles.mobileBottom : styles.rightFixed}>
            <button style={styles.cartBtn} onClick={() => router.push(`/${slugDaUrl}/carrinho`)}>
                🛒 ({cartCount})
            </button>
            
            {dadosLoja?.instagram && (
              <div style={styles.instaBox}>
                 <a href={`https://instagram.com/${dadosLoja.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={styles.instaLink}>
                   <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" style={styles.instaIcon} alt="Insta" />
                 </a>
              </div>
            )}
          </div>

        </div>
      </header>

      <main style={{...styles.grid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)'}}>
        {produtosFiltrados.length > 0 ? (
          produtosFiltrados.map((p) => (
            <div key={p.id} style={styles.card} onClick={() => router.push(`/produto/${p.id}?loja=${lojistaId}`)}>
              <div style={styles.imgWrapper}>
                <img src={p.capa} style={{...styles.img, height: isMobile ? 150 : 180}} alt={p.nome} />
              </div>
              <div style={styles.info}>
                <h3 style={styles.productName}>{p.nome}</h3>
                <div style={styles.priceValue}>R$ {p.precoBasico || p.preco}</div>
                <button style={styles.viewBtn}>Ver Detalhes</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
            Nenhum produto encontrado.
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>© {dadosLoja?.nomeLoja || slugDaUrl}</p>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' },
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif" },
  closedBar: { background: "#e74c3c", color: "#fff", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "12px" },
  header: { background: "#fff", borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1000, padding: '10px 0' },
  headerContainer: { display: 'flex', flexWrap: 'wrap', maxWidth: '1400px', margin: '0 auto', padding: '0 20px', alignItems: 'center', justifyContent: 'space-between' },
  leftFixed: { width: '250px' },
  mobileTop: { width: '100%', marginBottom: '10px', display: 'flex', justifyContent: 'center' },
  mobileBottom: { width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '20px' },
  brandWrapper: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  logoBox: { background: '#fff', padding: '3px', borderRadius: '50%', border: '1px solid #f1f5f9' },
  logoImg: { height: '45px', width: '45px', borderRadius: '50%', objectFit: 'cover' },
  brandName: { fontWeight: 'bold', fontSize: '16px', color: '#334155' },
  centerFlow: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', minWidth: '300px' },
  searchInput: { width: "100%", maxWidth: '400px', padding: "10px 20px", borderRadius: "20px", border: "1px solid #e2e8f0", background: '#f8fafc', outline: 'none', fontSize: '14px' },
  categoryRow: { display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '100%', padding: '5px 0' },
  categoryBtn: { border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", transition: '0.2s' },
  rightFixed: { width: '250px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' },
  cartBtn: { background: "#2ecc71", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer" },
  instaBox: { display: 'flex', alignItems: 'center' },
  instaLink: { display: 'flex', alignItems: 'center' },
  instaIcon: { height: '24px', width: '24px' },
  grid: { display: "grid", gap: '15px', padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: 'pointer', transition: 'transform 0.2s' },
  imgWrapper: { background: '#f1f5f9', overflow: 'hidden' },
  img: { width: "100%", objectFit: "cover" },
  info: { padding: "12px", textAlign: "center" },
  productName: { color: "#334155", fontSize: '13px', fontWeight: '600', height: '32px', marginBottom: '5px' },
  priceValue: { color: "#2ecc71", fontWeight: "800", fontSize: '16px', margin: '5px 0' },
  viewBtn: { background: "#f1f5f9", color: "#64748b", border: "none", padding: "8px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", width: "100%", cursor: 'pointer' },
  footer: { padding: '30px', textAlign: 'center', borderTop: '1px solid #e2e8f0', marginTop: '20px' },
  footerText: { color: '#94a3b8', fontSize: '11px' }
};