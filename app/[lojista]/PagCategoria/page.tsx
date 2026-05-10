"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, getDocs, limit } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, ChevronLeft } from "lucide-react"; // Importado ChevronLeft

export default function PaginaCategoria() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const categoriaAtiva = searchParams.get('cat');
  const lojistaSlug = params.lojista;

  const [produtos, setProdutos] = useState([]);
  const [categoriasFirebase, setCategoriasFirebase] = useState([]);
  const [dadosLoja, setDadosLoja] = useState({ slug: "", logoUrl: "", celular: "", nomeLoja: "" });
  const [lojistaId, setLojistaId] = useState(null);
  const [carrinhoCount, setCarrinhoCount] = useState(0);

  // --- CONFIGURAÇÃO VISUAL PADRONIZADA ---
  const config = {
    nomeLoja: dadosLoja.nomeLoja,
    corDestaque: "#FFCC80",
    corTextoDestaque: "#8B5E3C",
    corFundoSite: "#FFF9F2",
    linkWhatsapp: `https://wa.me/${dadosLoja.celular?.replace(/\D/g, '')}`
  };

  const atualizarContadorCarrinho = useCallback(() => {
    const key = `carrinho_${lojistaSlug}`;
    const salvo = localStorage.getItem(key);
    if (salvo) {
      const itens = JSON.parse(salvo);
      const total = itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);
      setCarrinhoCount(total);
    }
  }, [lojistaSlug]);

  useEffect(() => {
    async function carregarDono() {
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
          nomeLoja: d.nomeLoja || d.slug 
        });
      }
    }
    carregarDono();
    atualizarContadorCarrinho();
  }, [lojistaSlug, atualizarContadorCarrinho]);

  useEffect(() => {
    if (!lojistaId) return;

    const unsubCat = onSnapshot(collection(db, `lojistas/${lojistaId}/categorias`), (snapshot) => {
      setCategoriasFirebase(snapshot.docs.map(doc => doc.data().nome || doc.id));
    });

    const qProd = query(
      collection(db, `lojistas/${lojistaId}/produtos`),
      where("categoria", "==", categoriaAtiva)
    );

    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProdutos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubCat(); unsubProd(); };
  }, [lojistaId, categoriaAtiva]);

  const adicionarAoCarrinho = (e: React.MouseEvent, produto: any) => {
    e.stopPropagation();
    const key = `carrinho_${lojistaSlug}`;
    const salvo = localStorage.getItem(key);
    let itens = salvo ? JSON.parse(salvo) : [];

    const index = itens.findIndex((i: any) => i.id === produto.id);
    if (index > -1) {
      itens[index].quantidade += 1;
    } else {
      itens.push({ ...produto, quantidade: 1 });
    }

    localStorage.setItem(key, JSON.stringify(itens));
    atualizarContadorCarrinho();
    alert(`${produto.nome} adicionado ao carrinho!`); 
  };

  const navegarParaProduto = (id: string) => {
    router.push(`/produto/${id}?loja=${lojistaSlug}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: config.corFundoSite, fontFamily: 'sans-serif' }}>
      
      {/* HEADER PADRONIZADO - 2 CORES COM SOMBRA */}
      <header style={headerStyles.headerContainer}>
        <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
        <div style={{ backgroundColor: '#fdf5eb', height: '55px', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}></div>

        <div style={headerStyles.headerContent}>
          <div style={headerStyles.leftGroup}>
            <button onClick={() => router.back()} style={headerStyles.btnBack}>
              <ChevronLeft size={24} color="white" />
            </button>
            <div style={headerStyles.logoBox} onClick={() => router.push(`/${lojistaSlug}`)}>
              <div style={headerStyles.logoBorder}>
                {dadosLoja.logoUrl ? (
                  <img src={dadosLoja.logoUrl} style={headerStyles.logoImg} alt="Logo" />
                ) : (
                  <span style={{fontSize: '10px', color: '#333'}}>Logo</span>
                )}
              </div>
              <span style={headerStyles.nomeLojaText}>{config.nomeLoja || lojistaSlug}</span>
            </div>
          </div>

          <div style={headerStyles.cartIconBox} onClick={() => router.push(`/${lojistaSlug}/carrinho`)}>
            <ShoppingCart size={30} color="white" />
            {carrinhoCount > 0 && <span style={headerStyles.badge}>{carrinhoCount}</span>}
          </div>
        </div>
      </header>

      {/* TÍTULO DA CATEGORIA */}
      <div style={{ padding: '30px 20px', textAlign: 'center', marginTop: '115px' }}>
        <h2 style={{ color: config.corTextoDestaque, textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>{categoriaAtiva || "Categoria"}</h2>
        <p style={{ fontSize: '14px', color: '#666' }}>{produtos.length} produtos encontrados</p>
      </div>

      {/* GRID DE PRODUTOS */}
      <div style={{ padding: '0 15px 120px' }}>
        <div className="grid-layout">
          {produtos.map((prod: any) => (
            <div 
              key={prod.id} 
              onClick={() => navegarParaProduto(prod.id)}
              style={{ textAlign: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <img src={prod.capa || "https://via.placeholder.com/500"} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '5px' }} />
              <p style={{ margin: '10px 0 0', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{prod.nome}</p>
              
              <p style={{ margin: '5px 0', color: config.corTextoDestaque, fontWeight: 'bold', fontSize: '16px' }}>
                R$ {prod.precoBasico || "0,00"}
              </p>
              
              <button 
                onClick={(e) => adicionarAoCarrinho(e, prod)}
                style={{ backgroundColor: config.corDestaque, border: 'none', width: '100%', padding: '8px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', color: config.corTextoDestaque, fontSize: '12px' }}
              >
                Adicionar
              </button>
            </div>
          ))}
        </div>

        {produtos.length === 0 && (
          <p style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>Nenhum produto encontrado nesta categoria.</p>
        )}
      </div>

      {/* BOTÃO VOLTAR FIXO (OPCIONAL, JÁ QUE TEM NO HEADER) */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', backgroundColor: 'white', padding: '15px', borderTop: '1px solid #eee', textAlign: 'center', zIndex: 10 }}>
         <button 
           onClick={() => router.push(`/${lojistaSlug}`)}
           style={{ backgroundColor: 'transparent', border: `1px solid ${config.corTextoDestaque}`, color: config.corTextoDestaque, padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
         >
           ← Voltar ao Início
         </button>
      </div>

      <a href={config.linkWhatsapp} target="_blank" style={{ position: 'fixed', bottom: '85px', right: '20px', backgroundColor: '#25D366', color: 'white', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', textDecoration: 'none', zIndex: 99 }}>
        📞
      </a>

      <style jsx>{`
        .grid-layout { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
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
  logoBox: { display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' },
  logoBorder: { border: '1px solid black', width: '90px', height: '90px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' },
  nomeLojaText: { fontSize: '22px', color: 'white', fontWeight: 'bold' },
  cartIconBox: { position: 'relative', cursor: 'pointer', marginTop: '-15px' },
  badge: { position: 'absolute', top: '-5px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
};