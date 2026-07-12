"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  addDoc,
  serverTimestamp 
} from "firebase/firestore";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ShoppingCart, ChevronLeft } from "lucide-react";
import { useCart } from "@/app/context/CartContext";

export default function ProdutoAgrupadoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  const [produto, setProduto] = useState<any>(null);
  const [lojaDados, setLojaDados] = useState<any>(null);
  const [imgAtiva, setImgAtiva] = useState("");
  const [v1Selecionada, setV1Selecionada] = useState("");
  const [v2Selecionada, setV2Selecionada] = useState("");
  const [variacaoFinal, setVariacaoFinal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [carrinhoCount, setCarrinhoCount] = useState(0);

  const [showDenuncia, setShowDenuncia] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

  const lojaParam = searchParams.get("loja");

  const config = {
    corDestaque: lojaDados?.tema?.corPrincipal || "#FFCC80",
    corSecundaria: lojaDados?.tema?.corSecundaria || "#fdf5eb",
    corFundoSite: lojaDados?.tema?.corFundo || "#FFF9F2",
    corTextoDestaque: lojaDados?.tema?.corTextoCard || "#8B5E3C",
    corSucesso: "#25D366"
  };

  const safeNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const atualizarContadorCarrinho = useCallback(() => {
    if (!lojaParam) return;
    const key = `carrinho_${lojaParam}`;
    const salvo = localStorage.getItem(key);
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        const itens = Array.isArray(parsed) ? parsed : (parsed?.items || []);
        const total = itens.reduce((acc: number, item: any) => acc + safeNumber(item.qty || item.quantidade || 0), 0);
        setCarrinhoCount(total);
      } catch (err) {
        setCarrinhoCount(0);
      }
    } else {
      setCarrinhoCount(0);
    }
  }, [lojaParam]);

  const irParaHome = () => router.push(`/${lojaParam}`);
  const irParaCarrinho = () => router.push(`/${lojaParam}/carrinho`);

  useEffect(() => {
    async function load() {
      const prodId = params?.id as string;
      if (!prodId || !lojaParam) return setLoading(false);
      
      try {
        const qLoja = query(collection(db, "lojistas"), where("slug", "==", lojaParam), limit(1));
        const snapLoja = await getDocs(qLoja);
        
        if (!snapLoja.empty) {
          const lojistaDoc = snapLoja.docs[0];
          const lojistaId = lojistaDoc.id;
          const d = lojistaDoc.data();
          setLojaDados({ ...d, id: lojistaId, lojaAberta: d.lojaAberta !== false, tema: d.tema || {} });

          const refProd = doc(db, "lojistas", lojistaId, "produtos", prodId);
          const snapProd = await getDoc(refProd);
          
          if (snapProd.exists()) {
            const data = snapProd.data();
            setProduto(data);
            setImgAtiva(data.capa || "");
          }
        }
      } catch (e) { 
        console.error("Erro ao carregar dados:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    load();
  }, [params?.id, lojaParam]);

  useEffect(() => {
    if (lojaParam) {
      atualizarContadorCarrinho();
    }
  }, [lojaParam, atualizarContadorCarrinho]);

  const handleDenuncia = async () => {
    if (!motivoDenuncia.trim()) return alert("Por favor, descreva o motivo.");
    setEnviandoDenuncia(true);
    try {
      await addDoc(collection(db, "denuncias"), {
        lojaId: lojaDados?.id,
        produtoId: params.id,
        motivo: motivoDenuncia,
        data: serverTimestamp()
      });
      alert("Denúncia enviada!");
      setShowDenuncia(false);
      setMotivoDenuncia("");
    } catch (e) {
      console.error(e);
    } finally {
      setEnviandoDenuncia(false);
    }
  };

  const imagensGaleria = useMemo(() => {
    if (!produto) return [];
    const setImagens = new Set<string>();
    if (produto.capa) setImagens.add(produto.capa);
    if (produto.imagens && Array.isArray(produto.imagens)) {
      produto.imagens.forEach((img: string) => { if (img) setImagens.add(img); });
    }
    return Array.from(setImagens);
  }, [produto]);

  useEffect(() => {
    if (!produto?.variacoes || !v1Selecionada) return;
    const match = produto.variacoes.find((v: any) => {
      const val1 = (v.v1 || v.sabor || v.cor || v.modelo || "").trim().toLowerCase();
      const bateV1 = val1 === v1Selecionada.toLowerCase();
      if (!produto.nomeVar2) return bateV1;
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
    if (!v1Selecionada || !produto?.variacoes) return [];
    const sub = produto.variacoes.filter((v: any) => 
      (v.v1 || v.sabor || v.cor || v.modelo || "").trim().toLowerCase() === v1Selecionada.toLowerCase()
    );
    const vistas = new Set();
    return sub.map((v: any) => (v.v2 || v.tamanho || v.quantidade || "").trim()).filter((v: string) => {
      if (!v || vistas.has(v.toLowerCase())) return false;
      vistas.add(v.toLowerCase());
      return true;
    });
  }, [v1Selecionada, produto?.variacoes]);

  const podeAdicionar = useMemo(() => {
    if (lojaDados && lojaDados.lojaAberta === false) return false;
    if (!produto) return false;
    if (produto.nomeVar1 && !v1Selecionada) return false;
    if (produto.nomeVar2 && listaOpcoesV2.length > 0 && !v2Selecionada) return false;
    return true;
  }, [produto, v1Selecionada, v2Selecionada, listaOpcoesV2, lojaDados]);

  const handleAdicionar = () => {
    if (!podeAdicionar || !lojaParam || !produto) return;

    const key = `carrinho_${lojaParam}`;
    const salvo = localStorage.getItem(key);
    
    let dadosExistentes: any = { items: [] };
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        dadosExistentes = Array.isArray(parsed) ? { items: parsed } : (parsed?.items ? parsed : { items: [] });
      } catch (e) {
        dadosExistentes = { items: [] };
      }
    }

    const cartItemKey = `${params.id}_${v1Selecionada || "padrao"}_${v2Selecionada || "padrao"}`;
    const skuParaSalvar = variacaoFinal ? variacaoFinal.sku : (produto.sku || "SEM-SKU");
    const novoItem = {
      cartItemKey,
      id: params.id,
      sku: skuParaSalvar,
      nome: produto.nome,
      preco: variacaoFinal ? Number(variacaoFinal.preco) : Number(produto.precoBasico || 0),
      variacao: v1Selecionada + (v2Selecionada ? ` / ${v2Selecionada}` : ""),
      nomeVar1: produto.nomeVar1 || null,
      v1: v1Selecionada || null,
      nomeVar2: produto.nomeVar2 || null,
      v2: v2Selecionada || null,
      imagem: imgAtiva || produto.capa,
      quantidade: 1,
      qty: 1,
      requisitos: produto.requisitos || {},
      
      // GARANTIA DOS 3 CAMPOS LOGÍSTICOS
      permiteRetirada: !!produto.permiteRetirada,
      envioTransportadora: !!produto.envioTransportadora,
      precisaFrete: !!produto.precisaFrete,
      peso: produto.peso || 0.3
    };

    const idx = dadosExistentes.items.findIndex((i: any) => i.cartItemKey === cartItemKey);
    if (idx > -1) {
      dadosExistentes.items[idx].quantidade += 1;
      dadosExistentes.items[idx].qty += 1;
    } else {
      dadosExistentes.items.push(novoItem);
    }

    localStorage.setItem(key, JSON.stringify(dadosExistentes));
    addToCart(novoItem);

    alert("Produto adicionado ao carrinho!");
    atualizarContadorCarrinho();
  };

  if (loading) return <div style={styles.center}>Carregando...</div>;
  if (!produto) return <div style={styles.center}>Produto não encontrado.</div>;

  return (
    <div style={{ ...styles.pageContainer, backgroundColor: config.corFundoSite }}>
      <header style={styles.header}>
        <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
        <div style={{ backgroundColor: config.corSecundaria, height: '55px', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}></div>
        <div style={styles.headerContent}>
          <div style={styles.leftGroup}>
            <button onClick={() => router.back()} style={styles.btnBack}>
              <ChevronLeft size={24} color="white" />
            </button>
            <div style={styles.logoBox} onClick={irParaHome}>
              <div style={{ width: '90px', height: '90px', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '15px' }}>
                {lojaDados?.logoUrl ? <img src={lojaDados.logoUrl} style={styles.logoImg} alt="Logo" /> : <span style={{fontSize: '10px', color: '#333'}}>Logo</span>}
              </div>
              <span style={{ fontSize: '28px', color: 'white', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {(lojaDados?.nomeLoja || lojaParam || "").toUpperCase()}
              </span>
            </div>
          </div>
          
          {lojaDados?.lojaAberta !== false && (
            <div style={styles.cartIconBox} onClick={irParaCarrinho}>
              <ShoppingCart size={30} color="white" />
              {carrinhoCount > 0 && <span style={styles.badge}>{carrinhoCount}</span>}
            </div>
          )}
        </div>
      </header>

      {lojaDados?.lojaAberta === false && (
        <div style={{ position: 'fixed', top: '115px', left: 0, width: '100%', backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#be123c', padding: '12px 20px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', zIndex: 999, boxSizing: 'border-box' }}>
          📢 Modo Vitrine Ativado: Este estabelecimento está em período de férias. Pedidos desativados.
        </div>
      )}

      <main style={{...styles.main, paddingTop: lojaDados?.lojaAberta === false ? '160px' : '140px'}}>
        <div className="product-layout">
          <section className="gallery">
            <div style={styles.mainImgWrapper}>
              <img src={imgAtiva} style={styles.mainImg} alt="Produto Principal" />
            </div>
            <div style={styles.thumbScroll}>
              {imagensGaleria.map((img: string, idx: number) => (
                <div key={idx} onClick={() => setImgAtiva(img)} style={{...styles.thumb, border: imgAtiva === img ? `2px solid ${config.corDestaque}` : '1px solid #ddd'}}>
                  <img src={img} style={styles.thumbImg} alt="Miniatura" />
                </div>
              ))}
            </div>
          </section>

          <section style={styles.infoArea}>
            <h1 style={{...styles.productTitle, color: config.corTextoDestaque}}>{produto.nome}</h1>
            <div style={styles.priceContainer}>
               <span style={{...styles.priceText, color: config.corTextoDestaque}}>
                 R$ {variacaoFinal ? variacaoFinal.preco : (produto.precoBasico || "0,00")}
               </span>
            </div>

            <div style={styles.variationsSection}>
              {produto.nomeVar1 && (
                <div style={{marginBottom: '20px'}}>
                  <p style={styles.varLabel}>{produto.nomeVar1}</p>
                  <div style={styles.varGrid}>
                    {listaOpcoesV1.map((item: any, i: number) => {
                      const valor = (item.v1 || item.sabor || item.cor || item.modelo || "").trim();
                      const ativo = v1Selecionada === valor;
                      return (
                        <div key={i} onClick={() => { setV1Selecionada(valor); if(item.foto) setImgAtiva(item.foto); }} style={{...styles.varCard, border: ativo ? `2px solid ${config.corDestaque}` : '1px solid #ddd'}}>
                            <div style={styles.varImgBox}>{item.foto ? <img src={item.foto} style={styles.varCardImg} alt={valor} /> : <div style={{background: '#f0f0f0', height: '100%'}} />}</div>
                            <span style={styles.varLabelSmall}>{valor}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {produto.nomeVar2 && listaOpcoesV2.length > 0 && (
                <div style={{marginBottom: '20px'}}>
                  <p style={styles.varLabel}>{produto.nomeVar2}</p>
                  <div style={styles.varGrid}>
                    {listaOpcoesV2.map((v, i) => (
                      <button key={i} onClick={() => setV2Selecionada(v)} style={{...styles.v2Btn, backgroundColor: v2Selecionada === v ? config.corDestaque : '#fff', borderColor: v2Selecionada === v ? config.corDestaque : '#ddd', color: v2Selecionada === v ? 'white' : config.corTextoDestaque}}>{v}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              disabled={!podeAdicionar} 
              onClick={handleAdicionar} 
              style={{
                ...styles.btnAdd, 
                backgroundColor: lojaDados?.lojaAberta === false ? '#94a3b8' : (podeAdicionar ? config.corDestaque : '#ccc'), 
                color: podeAdicionar ? 'white' : '#666',
                cursor: podeAdicionar ? 'pointer' : 'not-allowed'
              }}
            >
              {lojaDados?.lojaAberta === false 
                ? "PEDIDOS BLOQUEADOS (MODO VITRINE)" 
                : (podeAdicionar ? "ADICIONAR AO CARRINHO" : "SELECIONE AS OPÇÕES")
              }
            </button>
          </section>
        </div>

        <section style={styles.descriptionSection}>
          <h3 style={{...styles.descTitle, color: config.corTextoDestaque}}>Descrição</h3>
          <p style={styles.descText}>{produto.descricao || "Este lojista não adicionou uma descrição para este produto."}</p>
        </section>
      </main>

      <footer style={styles.footerSticky}>
        <button onClick={() => setShowDenuncia(!showDenuncia)} style={styles.btnDenuncia}>N</button>
        {showDenuncia && (
          <div style={styles.denunciaBox}>
            <textarea value={motivoDenuncia} onChange={(e) => setMotivoDenuncia(e.target.value)} placeholder="Motivo da denúncia..." style={styles.textareaDenuncia} />
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={handleDenuncia} disabled={enviandoDenuncia} style={styles.btnEnviarDenuncia}>{enviandoDenuncia ? "..." : "Enviar"}</button>
              <button onClick={() => setShowDenuncia(false)} style={{ backgroundColor: '#ccc', border: 'none', padding: '5px', borderRadius: '4px' }}>X</button>
            </div>
          </div>
        )}
        <button onClick={irParaHome} style={{ ...styles.btnVoltarInicio, borderColor: config.corTextoDestaque, color: config.corTextoDestaque }}>← Voltar ao Início</button>
      </footer>
      <a href={`https://wa.me/${lojaDados?.celular?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{...styles.waFloat, backgroundColor: config.corSucesso}}>📞</a>

      <style jsx>{`
        .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        @media (max-width: 768px) { .product-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '70px' },
  header: { position: 'fixed', top: 0, width: '100%', height: '115px', zIndex: 1000, backgroundColor: 'transparent' },
  headerContent: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' },
  leftGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
  btnBack: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  logoBox: { display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  cartIconBox: { position: 'relative', cursor: 'pointer', marginTop: '-15px' },
  badge: { position: 'absolute', top: '-5px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '140px 20px 40px' },
  mainImgWrapper: { width: '100%', height: '500px', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0f0f0' },
  mainImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  thumbScroll: { display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '5px', justifyContent: 'center' },
  thumb: { width: '60px', height: '60px', borderRadius: '5px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  infoArea: { display: 'flex', flexDirection: 'column' },
  productTitle: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px' },
  priceContainer: { marginBottom: '25px' },
  priceText: { fontSize: '32px', fontWeight: '800' },
  variationsSection: { marginBottom: '20px' },
  varLabel: { fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#999', marginBottom: '8px' },
  varGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  varCard: { width: '65px', textAlign: 'center', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#fff' },
  varImgBox: { width: '100%', height: '50px', overflow: 'hidden' },
  varCardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  varLabelSmall: { fontSize: '10px', padding: '4px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  v2Btn: { padding: '8px 15px', borderRadius: '20px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  btnAdd: { width: '100%', padding: '18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: 'auto', transition: 'background-color 0.2s' },
  descriptionSection: { marginTop: '30px', backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #eee' },
  descTitle: { fontSize: '18px', marginBottom: '15px', fontWeight: 'bold' },
  descText: { fontSize: '15px', color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  footerSticky: { position: 'fixed', bottom: 0, width: '100%', backgroundColor: 'white', padding: '15px', borderTop: '1px solid #eee', textAlign: 'center', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnDenuncia: { position: 'absolute', left: '20px', backgroundColor: '#333', color: 'white', border: 'none', width: '35px', height: '35px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer' },
  btnVoltarInicio: { backgroundColor: 'transparent', border: '1px solid', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' },
  denunciaBox: { position: 'absolute', bottom: '70px', left: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 -4px 10px rgba(0,0,0,0.1)', width: '220px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 11 },
  textareaDenuncia: { width: '100%', height: '60px', padding: '5px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ddd' },
  btnEnviarDenuncia: { backgroundColor: '#d93025', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  waFloat: { position: 'fixed', bottom: '85px', right: '25px', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)', zIndex: 999, textDecoration: 'none' },
  center: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }
};
// pagina do detalhe do produto