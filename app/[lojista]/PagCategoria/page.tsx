"use client";
import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, getDocs, limit } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, ChevronLeft } from "lucide-react";
// IMPORTAR O HOOK DO CARRINHO
import { useCart } from "@/app/context/CartContext"; 

export default function PaginaCategoria() {
  // 🎯 CORREÇÃO DO ERRO PRINCIPAL: Removida a atribuição duplicada que travava o runtime
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // EXTRAIR AS FUNÇÕES DO CONTEXTO
  const { cart } = useCart(); 
  
  const categoriaAtiva = searchParams.get('cat');
  const subcategoriaAtiva = searchParams.get('sub'); 
  const lojistaSlug = params.lojista as string;

  const [produtos, setProdutos] = useState([]);
  // FLAG lojaAberta NO ESTADO INICIAL
  const [dadosLoja, setDadosLoja] = useState({ slug: "", logoUrl: "", celular: "", nomeLoja: "", lojaAberta: true, tema: {} });
  const [lojistaId, setLojistaId] = useState(null);

  const config = {
    nomeLoja: dadosLoja.nomeLoja,
    corDestaque: (dadosLoja.tema as any)?.corPrincipal || "#FFCC80",
    corSecundaria: (dadosLoja.tema as any)?.corSecundaria || "#fdf5eb",
    corFundoSite: (dadosLoja.tema as any)?.corFundo || "#FFF9F2",
    corTextoCard: (dadosLoja.tema as any)?.corTextoCard || "#8B5E3C",
    linkWhatsapp: `https://wa.me/${dadosLoja.celular?.replace(/\D/g, '')}`
  };

  useEffect(() => {
    async function carregarDono() {
      if (!lojistaSlug) return;
      const q = query(collection(db, "lojistas"), where("slug", "==", lojistaSlug), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setLojistaId(docSnap.id);
        const d = docSnap.data();
        setDadosLoja({
          slug: d.slug || "",
          logoUrl: d.logoUrl || "",
          celular: d.celular || "",
          nomeLoja: d.nomeLoja || d.slug,
          lojaAberta: d.lojaAberta !== false, // CAPTURA SE A LOJA ESTÁ ABERTA OU EM MODO VITRINE
          tema: d.tema || {}
        });
      }
    }
    carregarDono();
  }, [lojistaSlug]);

  useEffect(() => {
    if (!lojistaId || !categoriaAtiva) return;

    let qProd;
    if (subcategoriaAtiva) {
      qProd = query(
        collection(db, `lojistas/${lojistaId}/produtos`),
        where("categoria", "==", categoriaAtiva),
        where("subcategoria", "==", subcategoriaAtiva),
        where("ativo", "==", true)
      );
    } else {
      qProd = query(
        collection(db, `lojistas/${lojistaId}/produtos`),
        where("categoria", "==", categoriaAtiva),
        where("ativo", "==", true)
      );
    }

    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProdutos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubProd();
  }, [lojistaId, categoriaAtiva, subcategoriaAtiva]);

  const navegarParaProduto = (id: string) => {
    router.push(`/produto/${id}?loja=${lojistaSlug}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: config.corFundoSite, fontFamily: 'sans-serif' }}>
      
      <header style={headerStyles.headerContainer}>
        <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
        <div style={{ backgroundColor: config.corSecundaria, height: '55px', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}></div>

        <div style={headerStyles.headerContent}>
          <div style={headerStyles.leftGroup}>
            <button onClick={() => router.back()} style={headerStyles.btnBack}>
              <ChevronLeft size={32} color="white" strokeWidth={3} />
            </button>
            <div style={headerStyles.logoBox} onClick={() => router.push(`/${lojistaSlug}`)}>
              <div style={headerStyles.logoWrapper}>
                {dadosLoja.logoUrl ? (
                  <img src={dadosLoja.logoUrl} style={headerStyles.logoImg} alt="Logo" />
                ) : (
                  <span style={{fontSize: '10px', color: '#333'}}>Logo</span>
                )}
              </div>
              <span style={headerStyles.nomeLojaText}>
                {(config.nomeLoja || lojistaSlug).toUpperCase()}
              </span>
            </div>
          </div>

          {/* 🔥 SE A LOJA ESTIVER EM MODO FÉRIAS/VITRINE, ESCONDE O ÍCONE DO CARRINHO PARA IMPEDIR CHECKOUT */}
          {dadosLoja.lojaAberta !== false && (
            <div style={headerStyles.cartIconBox} onClick={() => router.push(`/${lojistaSlug}/carrinho`)}>
              <ShoppingCart size={30} color="white" />
              {cart.length > 0 && (
                <span style={headerStyles.badge}>
                  {cart.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 🔥 TARGETA DE AVISO: EXIBIDA ABAIXO DO HEADER CASO A LOJA ESTEJA EM MODO VITRINE */}
      {dadosLoja.lojaAberta === false && (
        <div style={{ position: 'fixed', top: '115px', left: 0, width: '100%', backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#be123c', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', zIndex: 999, boxSizing: 'border-box' }}>
          📢 Modo Vitrine Ativado: Estamos em período de férias. Pedidos temporariamente suspensos.
        </div>
      )}

      {/* Ajustado o espaçamento superior dinamicamente se a targeta de aviso estiver visível */}
      <div style={{ padding: '30px 20px', textAlign: 'center', marginTop: dadosLoja.lojaAberta === false ? '160px' : '115px' }}>
        <h2 style={{ color: config.corTextoCard, textTransform: 'uppercase', margin: 0, fontWeight: 'bold', fontSize: '18px' }}>
          {categoriaAtiva} {subcategoriaAtiva && ` > ${subcategoriaAtiva}`}
        </h2>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>{produtos.length} produtos encontrados</p>
      </div>

      <div style={{ padding: '0 15px 120px' }}>
        <div className="grid-layout">
          {produtos.map((prod: any) => (
            <div 
              key={prod.id} 
              className="card-produto"
              onClick={() => navegarParaProduto(prod.id)}
              style={{ textAlign: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              <img src={prod.capa || "https://via.placeholder.com/500"} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '5px' }} alt={prod.nome} />
              <p style={{ margin: '10px 0 0', fontSize: '13px', fontWeight: 'bold', color: config.corTextoCard }}>{prod.nome}</p>
              
              <p style={{ margin: '5px 0', color: config.corTextoCard, fontWeight: 'bold', fontSize: '16px' }}>
                R$ {prod.precoBasico || "0,00"}
              </p>
              
              {/* 🔥 BOTÃO DINÂMICO REESTRUTURADO PARA SINALIZAR O MODO VITRINE */}
              <button 
                style={{ 
                  backgroundColor: dadosLoja.lojaAberta === false ? '#94a3b8' : config.corDestaque, 
                  border: 'none', 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '5px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  color: 'white', 
                  fontSize: '12px',
                  transition: 'background-color 0.2s'
                }}
              >
                {dadosLoja.lojaAberta === false ? "Apenas Vitrine" : "Detalhes"}
              </button>
            </div>
          ))}
        </div>

        {produtos.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
             <p style={{ color: '#999' }}>Nenhum produto encontrado nesta seleção.</p>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, width: '100%', backgroundColor: 'white', padding: '15px', borderTop: '1px solid #eee', textAlign: 'center', zIndex: 10 }}>
         <button 
           onClick={() => router.push(`/${lojistaSlug}`)}
           style={{ backgroundColor: 'transparent', border: `1px solid ${config.corTextoCard}`, color: config.corTextoCard, padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
         >
           ← Voltar ao Início
         </button>
      </div>

      <a href={config.linkWhatsapp} target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '85px', right: '20px', backgroundColor: '#25D366', color: 'white', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', textDecoration: 'none', zIndex: 99 }}>
        📞
      </a>

      <style jsx>{`
        .grid-layout { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .card-produto:hover { transform: scale(1.02); }
        @media (min-width: 1024px) {
          .grid-layout { grid-template-columns: repeat(4, 1fr) !important; max-width: 1200px; margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}

const headerStyles: { [key: string]: React.CSSProperties } = {
  headerContainer: { position: 'fixed', top: 0, width: '100%', height: '115px', zIndex: 1000, backgroundColor: 'transparent' },
  headerContent: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' },
  leftGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
  btnBack: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  logoBox: { display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' },
  logoWrapper: { width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '15px', backgroundColor: 'transparent' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  nomeLojaText: { fontSize: '28px', color: 'white', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', letterSpacing: '1px' },
  cartIconBox: { position: 'relative', cursor: 'pointer', marginTop: '-15px' },
  badge: { position: 'absolute', top: '-5px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
};