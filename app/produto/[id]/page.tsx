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
  limit 
} from "firebase/firestore";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ShoppingCart, ChevronLeft } from "lucide-react";

export default function ProdutoAgrupadoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [produto, setProduto] = useState<any>(null);
  const [lojaDados, setLojaDados] = useState<any>(null);
  const [imgAtiva, setImgAtiva] = useState("");
  const [v1Selecionada, setV1Selecionada] = useState("");
  const [v2Selecionada, setV2Selecionada] = useState("");
  const [variacaoFinal, setVariacaoFinal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [carrinhoCount, setCarrinhoCount] = useState(0);

  const lojaParam = searchParams.get("loja");

  const config = {
    corDestaque: "#FFCC80",    
    corFundoSite: "#FFF9F2",   
    corTextoDestaque: "#8B5E3C",
    corSucesso: "#25D366"
  };

  const atualizarContadorCarrinho = useCallback(() => {
    if (!lojaParam) return;
    const key = `carrinho_${lojaParam}`;
    const salvo = localStorage.getItem(key);
    if (salvo) {
      const itens = JSON.parse(salvo);
      const total = itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);
      setCarrinhoCount(total);
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
          setLojaDados({ ...lojistaDoc.data(), id: lojistaId });

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
    atualizarContadorCarrinho();
  }, [params?.id, lojaParam, atualizarContadorCarrinho]);

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
    if (!produto) return false;
    if (produto.nomeVar1 && !v1Selecionada) return false;
    if (produto.nomeVar2 && listaOpcoesV2.length > 0 && !v2Selecionada) return false;
    return true;
  }, [produto, v1Selecionada, v2Selecionada, listaOpcoesV2]);

  const handleAdicionar = () => {
    if (!podeAdicionar) return;
    const key = `carrinho_${lojaParam}`;
    const salvo = localStorage.getItem(key);
    let itens = salvo ? JSON.parse(salvo) : [];

    const item = {
      id: params.id,
      nome: produto.nome,
      preco: variacaoFinal ? variacaoFinal.preco : (produto.precoBasico || 0),
      variacao: v1Selecionada + (v2Selecionada ? ` / ${v2Selecionada}` : ""),
      imagem: imgAtiva || produto.capa,
      quantidade: 1
    };

    const idx = itens.findIndex((i: any) => i.id === item.id && i.variacao === item.variacao);
    if (idx > -1) itens[idx].quantidade += 1;
    else itens.push(item);

    localStorage.setItem(key, JSON.stringify(itens));
    atualizarContadorCarrinho();
    alert("Produto adicionado ao carrinho!");
  };

  if (loading) return <div style={styles.center}>Carregando...</div>;
  if (!produto) return <div style={styles.center}>Produto não encontrado.</div>;

  return (
    <div style={{ ...styles.pageContainer, backgroundColor: config.corFundoSite }}>
      
      {/* HEADER PADRONIZADO - COM SOMBRA SUTIL PARA SEPARAÇÃO */}
      <header style={styles.header}>
        <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
        {/* Adicionada sombra suave (box-shadow) na barra inferior para separar do fundo */}
        <div style={{ backgroundColor: '#fdf5eb', height: '55px', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}></div>

        <div style={styles.headerContent}>
          <div style={styles.leftGroup}>
            <button onClick={() => router.back()} style={styles.btnBack}>
              <ChevronLeft size={24} color="white" />
            </button>
            <div style={styles.logoBox} onClick={irParaHome}>
              <div style={styles.logoBorder}>
                {lojaDados?.logoUrl ? (
                  <img src={lojaDados.logoUrl} style={styles.logoImg} alt="Logo" />
                ) : (
                  <span style={{fontSize: '10px', color: '#333'}}>Logo</span>
                )}
              </div>
              <span style={styles.nomeLojaText}>{lojaDados?.nomeLoja || lojaParam}</span>
            </div>
          </div>

          <div style={styles.cartIconBox} onClick={irParaCarrinho}>
            <ShoppingCart size={30} color="white" />
            {carrinhoCount > 0 && <span style={styles.badge}>{carrinhoCount}</span>}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div className="product-layout">
          {/* GALERIA */}
          <section className="gallery">
            <div style={styles.mainImgWrapper}>
              <img src={imgAtiva} style={styles.mainImg} alt="Produto Principal" />
            </div>
            <div style={styles.thumbScroll}>
              {[produto.capa, ...(produto.imagens || [])].filter(Boolean).map((img: any, idx: number) => (
                <div key={idx} onClick={() => setImgAtiva(img)} 
                     style={{...styles.thumb, border: imgAtiva === img ? `2px solid ${config.corDestaque}` : '1px solid #ddd'}}>
                  <img src={img} style={styles.thumbImg} alt="Miniatura" />
                </div>
              ))}
            </div>
          </section>

          {/* INFORMAÇÕES */}
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
                        <div key={i} onClick={() => { setV1Selecionada(valor); if(item.foto) setImgAtiva(item.foto); }} 
                             style={{...styles.varCard, border: ativo ? `2px solid ${config.corDestaque}` : '1px solid #ddd'}}>
                           <div style={styles.varImgBox}>
                             {item.foto ? <img src={item.foto} style={styles.varCardImg} alt={valor} /> : <div style={{background: '#f0f0f0', height: '100%'}} />}
                           </div>
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
                      <button key={i} onClick={() => setV2Selecionada(v)} 
                              style={{...styles.v2Btn, backgroundColor: v2Selecionada === v ? config.corDestaque : '#fff', borderColor: v2Selecionada === v ? config.corDestaque : '#ddd', color: config.corTextoDestaque}}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              disabled={!podeAdicionar} 
              onClick={handleAdicionar}
              style={{...styles.btnAdd, backgroundColor: podeAdicionar ? config.corDestaque : '#ccc', color: config.corTextoDestaque}}
            >
              {podeAdicionar ? "ADICIONAR AO CARRINHO" : "SELECIONE AS OPÇÕES"}
            </button>
          </section>
        </div>

        <section style={styles.descriptionSection}>
          <h3 style={{...styles.descTitle, color: config.corTextoDestaque}}>Descrição</h3>
          <p style={styles.descText}>{produto.descricao || "Este lojista não adicionou uma descrição para este produto."}</p>
        </section>
      </main>

      <a href={`https://wa.me/${lojaDados?.celular?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{...styles.waFloat, backgroundColor: config.corSucesso}}>
        📞
      </a>

      <style jsx>{`
        .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        @media (max-width: 768px) {
          .product-layout { grid-template-columns: 1fr; }
          main { padding-top: 50px !important; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { position: 'fixed', top: 0, width: '100%', height: '115px', zIndex: 1000, backgroundColor: 'transparent' },
  headerContent: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' },
  leftGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
  btnBack: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  logoBox: { display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' },
  logoBorder: { border: '1px solid black', width: '90px', height: '90px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  nomeLojaText: { fontSize: '22px', color: 'white', fontWeight: 'bold' },
  cartIconBox: { position: 'relative', cursor: 'pointer', marginTop: '-15px' },
  badge: { position: 'absolute', top: '-5px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '140px 20px 40px' },
  mainImgWrapper: { width: '100%', aspectRatio: '1/1', backgroundColor: '#fdfdfd', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0f0f0' },
  mainImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  thumbScroll: { display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '5px' },
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
  btnAdd: { width: '100%', padding: '18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: 'auto' },
  descriptionSection: { marginTop: '30px', backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #eee' },
  descTitle: { fontSize: '18px', marginBottom: '15px', fontWeight: 'bold' },
  descText: { fontSize: '15px', color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  waFloat: { position: 'fixed', bottom: '25px', right: '25px', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)', zIndex: 999, textDecoration: 'none' },
  center: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }
};