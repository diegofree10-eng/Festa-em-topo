"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useParams, useSearchParams, useRouter } from "next/navigation";
// IMPORTAÇÃO DO CONTEXTO DO CARRINHO
import { useCart } from "@/app/context/CartContext"; 
import { 
  ShoppingCart, 
  Search, 
  Home, 
  User, 
  ShoppingBag,
  Heart,
  AlertTriangle,
  X 
} from "lucide-react";

export default function ProdutoAgrupadoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // ACESSO AO CONTEXTO DO CARRINHO
  const { addToCart, cart } = useCart();

  const [produto, setProduto] = useState<any>(null);
  const [lojaDados, setLojaDados] = useState<any>(null);
  const [imgAtiva, setImgAtiva] = useState("");
  const [v1Selecionada, setV1Selecionada] = useState("");
  const [v2Selecionada, setV2Selecionada] = useState("");
  const [variacaoFinal, setVariacaoFinal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");

  const [isModalDenunciaOpen, setIsModalDenunciaOpen] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

  const lojaParam = searchParams.get("loja");

  const irParaHome = useCallback(() => {
    router.push(`/${lojaDados?.slug || lojaParam || 'catalogo'}`);
  }, [router, lojaDados, lojaParam]);

  const irParaCarrinho = () => {
    const slug = lojaDados?.slug || lojaParam;
    if (slug) {
      router.push(`/${slug}/carrinho`);
    }
  };

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    if (termoBusca.trim()) {
      router.push(`/${lojaDados?.slug || lojaParam}?search=${encodeURIComponent(termoBusca.trim())}`);
    }
  };

  const handleEnviarDenuncia = async () => {
    if (!motivoDenuncia.trim()) return alert("Por favor, descreva o motivo.");
    setEnviandoDenuncia(true);
    try {
      await addDoc(collection(db, "denuncias"), {
        createdAt: Date.now(),
        timestamp: serverTimestamp(),
        lojistaId: lojaDados?.uid || "",
        nomeLoja: lojaDados?.nomeLoja || "",
        slugLoja: lojaDados?.slug || "",
        produtoId: params?.id || "",
        nomeProduto: produto?.nome || "",
        motivo: motivoDenuncia,
        status: "pendente",
        tipo: "PRODUTO"
      });
      alert("Denúncia enviada com sucesso.");
      setMotivoDenuncia("");
      setIsModalDenunciaOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar denúncia.");
    } finally {
      setEnviandoDenuncia(false);
    }
  };

  useEffect(() => {
    async function load() {
      const prodId = params?.id as string;
      if (!prodId || !lojaParam) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let lojaEncontradaId = "";
        let lojaEncontradaDados = null;

        const refLojaDireta = doc(db, "lojistas", lojaParam);
        const snapLojaDireta = await getDoc(refLojaDireta);

        if (snapLojaDireta.exists()) {
          lojaEncontradaId = snapLojaDireta.id;
          lojaEncontradaDados = snapLojaDireta.data();
        } else {
          const q = query(collection(db, "lojistas"), where("slug", "==", lojaParam.toLowerCase().trim()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            lojaEncontradaId = querySnapshot.docs[0].id;
            lojaEncontradaDados = querySnapshot.docs[0].data();
          }
        }

        if (lojaEncontradaId) {
          setLojaDados({ ...lojaEncontradaDados, uid: lojaEncontradaId });
          const refProd = doc(db, "lojistas", lojaEncontradaId, "produtos", prodId);
          const snapProd = await getDoc(refProd);
          if (snapProd.exists()) {
            const data = snapProd.data();
            setProduto(data);
            setImgAtiva(data.capa || "");
          }
        }
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params?.id, lojaParam]);

  useEffect(() => {
    if (!produto?.variacoes || !v1Selecionada) return;
    const match = produto.variacoes.find((v: any) => {
      const val1 = (v.v1 || v.sabor || v.cor || v.modelo || "").trim().toLowerCase();
      const bateV1 = val1 === v1Selecionada.toLowerCase();
      if (!produto.nomeVar2 || produto.nomeVar2.trim() === "") return bateV1;
      const val2 = (v.v2 || v.tamanho || v.quantidade || "").trim().toLowerCase();
      return bateV1 && val2 === v2Selecionada.toLowerCase();
    });
    setVariacaoFinal(match || null);
  }, [v1Selecionada, v2Selecionada, produto]);

  const listaOpcoesV1 = useMemo(() => {
    if (!produto?.variacoes) return [];
    const vistas = new Set();
    return produto.variacoes.filter((v: any) => {
      const valor = (v.v1 || v.sabor || v.cor || v.modelo || "").trim();
      if (!valor || vistas.has(valor.toLowerCase())) return false;
      vistas.add(valor.toLowerCase());
      return true;
    });
  }, [produto?.variacoes]);

  const listaOpcoesV2 = useMemo(() => {
    if (!v1Selecionada || !produto?.variacoes || !produto.nomeVar2) return [];
    const sub = produto.variacoes.filter((v: any) => {
      const val = (v.v1 || v.sabor || v.cor || v.modelo || "").trim().toLowerCase();
      return val === v1Selecionada.toLowerCase();
    });
    const vistas = new Set();
    return sub.map((v: any) => (v.v2 || v.tamanho || v.quantidade || "").trim()).filter((v: string) => {
      if (!v || vistas.has(v.toLowerCase())) return false;
      vistas.add(v.toLowerCase());
      return true;
    });
  }, [v1Selecionada, produto?.variacoes, produto?.nomeVar2]);

  const podeAdicionar = useMemo(() => {
    if (!produto) return false;
    const precisaV1 = !!produto.nomeVar1;
    const precisaV2 = !!produto.nomeVar2 && listaOpcoesV2.length > 0;
    if (precisaV1 && !v1Selecionada) return false;
    if (precisaV2 && !v2Selecionada) return false;
    return true;
  }, [produto, v1Selecionada, v2Selecionada, listaOpcoesV2]);

  // FUNÇÃO ATUALIZADA PARA SALVAR NO CARRINHO GLOBAL
  const handleAdicionar = () => {
    if (podeAdicionar) {
      const itemParaCarrinho = {
        id: params.id,
        nome: produto.nome,
        // Usa o preço da variação se houver, senão o preço básico
        preco: variacaoFinal ? variacaoFinal.preco : (produto.precoBasico || 0),
        // Monta o texto da variação para exibição no carrinho
        variacao: v1Selecionada + (v2Selecionada ? ` / ${v2Selecionada}` : ""),
        imagem: imgAtiva || produto.capa,
        quantidade: 1,
        lojistaId: lojaDados?.uid || lojaParam
      };

      addToCart(itemParaCarrinho);
      alert("Produto adicionado ao carrinho!");
    }
  };

  if (loading) return <div style={styles.center}>Carregando...</div>;
  if (!produto) return <div style={styles.center}>Produto não encontrado.</div>;

  return (
    <div style={styles.pageContainer}>
      <header style={styles.headerBanner}>
        <div style={styles.headerContent}>
          <div style={styles.logoWrapper} onClick={irParaHome}>
             {lojaDados?.logoUrl ? (
               <img src={lojaDados.logoUrl} alt="Logo" style={styles.logoImg} />
             ) : (
               <span style={styles.lojaNomeHeader}>{lojaDados?.nomeLoja}</span>
             )}
          </div>

          <div style={styles.searchCenter}>
            <form onSubmit={handleBusca} style={styles.searchBar}>
              <Search size={18} color="#999" style={{ flexShrink: 0 }} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                style={styles.searchInput}
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </form>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.cartContainer} onClick={irParaCarrinho}>
              <ShoppingCart size={24} color="#333" />
              {/* O BADGE AGORA REFLETE O TAMANHO DO CARRINHO DO CONTEXTO */}
              {cart.length > 0 && <span style={styles.cartBadge}>{cart.length}</span>}
            </div>
          </div>
        </div>
      </header>

      <main style={styles.wrapper}>
        <div className="product-card-layout">
          <div className="gallery-section">
            <div className="main-img-box">
              <img src={imgAtiva} className="img-contain" alt={produto.nome} />
            </div>
            <div className="thumb-grid">
              {(Array.from(new Set([produto.capa, ...(produto.imagens || [])].filter(Boolean)))).map((img: any, idx: number) => (
                <div key={idx} onClick={() => setImgAtiva(img)} 
                     className={`thumb-item ${imgAtiva === img ? 'active' : ''}`}>
                  <img src={img} className="img-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="info-section">
            <h1 style={styles.title}>{produto.nome}</h1>
            <div style={styles.priceTag}>
               <span style={styles.currency}>R$</span>
               <span style={styles.price}>{variacaoFinal ? variacaoFinal.preco : (produto.precoBasico || "0,00")}</span>
            </div>
            
            <div style={styles.variationsArea}>
              {produto.nomeVar1 && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>{produto.nomeVar1}</label>
                  <div className="v-list">
                    {listaOpcoesV1.map((item: any, i: number) => {
                      const valor = (item.v1 || item.sabor || item.cor || item.modelo || "").trim();
                      const isAtivo = v1Selecionada === valor;
                      return (
                        <div key={i} onClick={() => { setV1Selecionada(valor); setV2Selecionada(""); if (item.foto) setImgAtiva(item.foto); }} 
                             className={`v1-card ${isAtivo ? 'active' : ''}`}>
                          <div className="v1-img-box">
                            {item.foto ? <img src={item.foto} className="img-cover" /> : <div style={styles.noImg}>-</div>}
                          </div>
                          <span className="v1-label">{valor}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {produto.nomeVar2 && listaOpcoesV2.length > 0 && (
                <div>
                  <label style={styles.label}>{produto.nomeVar2}</label>
                  <div className="v-list">
                    {listaOpcoesV2.map((v, i) => (
                      <button key={i} onClick={() => setV2Selecionada(v)} 
                              className={`v2-btn ${v2Selecionada === v ? 'active' : ''}`}>{v}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              disabled={!podeAdicionar}
              onClick={handleAdicionar}
              className={`btn-add-desktop ${!podeAdicionar ? 'btn-disabled' : ''}`}
            >
              {podeAdicionar ? "ADICIONAR AO CARRINHO" : "SELECIONE AS OPÇÕES"}
            </button>
          </div>
        </div>

        <div style={styles.descBox}>
          <h3 style={styles.descTitle}>Descrição do Produto</h3>
          <p style={styles.descText}>{produto.descricao || "Sem descrição adicional."}</p>
          
          <div style={styles.denunciaFooter}>
            <button onClick={() => setIsModalDenunciaOpen(true)} style={styles.btnDenuncia}>
              <AlertTriangle size={14} /> Denunciar este produto
            </button>
          </div>
        </div>
      </main>

      {isModalDenunciaOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Denunciar Produto</h3>
              <button onClick={() => setIsModalDenunciaOpen(false)} style={styles.btnClose}>
                <X size={20} />
              </button>
            </div>
            <textarea 
              placeholder="Descreva o motivo..."
              style={styles.modalTextarea}
              value={motivoDenuncia}
              onChange={(e) => setMotivoDenuncia(e.target.value)}
            />
            <button 
              onClick={handleEnviarDenuncia}
              disabled={enviandoDenuncia}
              style={{
                ...styles.btnSubmitDenuncia,
                backgroundColor: enviandoDenuncia ? '#ccc' : '#e74c3c'
              }}
            >
              {enviandoDenuncia ? "Enviando..." : "Enviar Denúncia"}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE UI */}
      <div className="mobile-only">
          <div style={styles.mobilePurchaseBar}>
             <div style={styles.stickyPrice}>
                <span style={{fontSize: '11px', color: '#888'}}>Total</span>
                <span style={{fontWeight: 'bold', color: '#2ecc71', fontSize: '18px', display: 'block'}}>
                  R$ {variacaoFinal ? variacaoFinal.preco : produto.precoBasico}
                </span>
             </div>
             <button 
               disabled={!podeAdicionar}
               onClick={handleAdicionar}
               style={{
                 ...styles.btnComprarMobile,
                 backgroundColor: podeAdicionar ? '#2ecc71' : '#ccc'
               }}
             >
               {podeAdicionar ? "ADICIONAR" : "SELECIONE"}
             </button>
          </div>
          <nav style={styles.bottomNav}>
            <div style={styles.navItem} onClick={irParaHome}><Home size={24} color="#333" /><span style={styles.navText}>Início</span></div>
            <div style={styles.navItem}><ShoppingBag size={24} color="#333" /><span style={styles.navText}>Produtos</span></div>
            <div style={styles.navItem} onClick={irParaCarrinho}><ShoppingCart size={24} color="#333" /><span style={styles.navText}>Carrinho</span></div>
            <div style={styles.navItem}><User size={24} color="#e67e22" /><span style={{...styles.navText, color: '#e67e22'}}>Eu</span></div>
          </nav>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        .product-card-layout { display: grid; grid-template-columns: 400px 1fr; gap: 24px; background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; }
        .main-img-box { width: 100%; height: 400px; background: #fdfdfd; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #f0f0f0; }
        .img-contain { max-width: 100%; max-height: 100%; object-fit: contain; }
        .img-cover { width: 100%; height: 100%; object-fit: cover; }
        .thumb-grid { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; }
        .thumb-item { width: 55px; height: 55px; border-radius: 6px; border: 1px solid #eee; overflow: hidden; cursor: pointer; flex-shrink: 0; }
        .thumb-item.active { border: 2px solid #2ecc71; }
        .info-section { display: flex; flex-direction: column; }
        .v-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
        .v1-card { width: 60px; cursor: pointer; text-align: center; }
        .v1-img-box { width: 60px; height: 60px; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; margin-bottom: 4px; }
        .v1-card.active .v1-img-box { border: 2px solid #2ecc71; }
        .v1-label { font-size: 10px; color: #444; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .v2-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #ddd; background: #fff; font-size: 13px; cursor: pointer; }
        .v2-btn.active { background: #2ecc71; color: #fff; border-color: #2ecc71; }
        .btn-add-desktop { margin-top: auto; width: 100%; height: 48px; background: #2ecc71; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; }
        .btn-disabled { background: #ccc !important; cursor: not-allowed !important; }

        @media (max-width: 768px) {
          .product-card-layout { display: block; padding: 0; border: none; border-radius: 0; }
          .main-img-box { height: 320px; border-radius: 0; border: none; }
          .info-section { padding: 20px; }
          .btn-add-desktop { display: none; }
          main { padding-top: 85px !important; padding-bottom: 140px !important; }
          .mobile-only { display: block; }
        }
        @media (min-width: 769px) { .mobile-only { display: none; } }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { minHeight: '100vh', background: '#fcfcfc' },
  headerBanner: { position: 'fixed', top: 0, left: 0, width: '100%', height: '80px', background: '#fff', zIndex: 1000, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' },
  headerContent: { maxWidth: '1100px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', gap: '10px' },
  logoWrapper: { flex: '0 0 auto', cursor: 'pointer', minWidth: '40px' },
  logoImg: { height: '55px', maxWidth: '100px', objectFit: 'contain' },
  lojaNomeHeader: { fontWeight: 'bold', fontSize: '14px', color: '#333', whiteSpace: 'nowrap' },
  searchCenter: { flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 },
  searchBar: { display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '8px 12px', borderRadius: '25px', width: '100%', maxWidth: '400px' },
  searchInput: { background: 'none', border: 'none', marginLeft: '8px', width: '100%', outline: 'none', fontSize: '14px' },
  headerActions: { flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', minWidth: '40px' },
  cartContainer: { position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 },
  cartBadge: { position: 'absolute', top: '-8px', right: '-10px', background: '#e74c3c', color: '#fff', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  wrapper: { maxWidth: '1000px', margin: '0 auto', padding: '100px 15px 30px 15px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#222', marginBottom: '8px' },
  priceTag: { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' },
  currency: { fontSize: '16px', fontWeight: '600', color: '#2ecc71' },
  price: { fontSize: '28px', fontWeight: '800', color: '#2ecc71' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' },
  noImg: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#ccc' },
  descBox: { marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' },
  descTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '10px' },
  descText: { fontSize: '14px', color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  denunciaFooter: { marginTop: '30px', borderTop: '1px solid #f0f0f0', paddingTop: '15px', textAlign: 'right' },
  btnDenuncia: { background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalContent: { background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  btnClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#666' },
  modalTextarea: { width: '100%', height: '120px', borderRadius: '8px', border: '1px solid #ddd', padding: '10px', fontSize: '14px', resize: 'none', marginBottom: '15px', outline: 'none' },
  btnSubmitDenuncia: { width: '100%', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  mobilePurchaseBar: { position: 'fixed', bottom: '60px', left: 0, width: '100%', height: '70px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 999 },
  stickyPrice: { display: 'flex', flexDirection: 'column' },
  btnComprarMobile: { color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, width: '100%', height: '60px', background: '#fff', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000 },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' },
  navText: { fontSize: '11px', marginTop: '2px' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }
};