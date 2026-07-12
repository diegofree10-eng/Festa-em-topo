"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs, limit } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { FiInstagram, FiFacebook, FiYoutube, FiGlobe, FiSearch, FiChevronLeft, FiChevronRight, FiMenu, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaTiktok } from "react-icons/fa";
// 1. IMPORTAR O HOOK DO CARRINHO
import { useCart } from "@/app/context/CartContext";
import { Produto } from "@/types";

interface Categoria {
  id: string;
  nome?: string;
  [key: string]: any;
}

export default function PaginaFinal() {
  const params = useParams();
  const router = useRouter();

  // 2. EXTRAIR AS FUNÇÕES DO CONTEXTO
  const { cart } = useCart() as { cart: Produto[] };

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [categoriasFirebase, setCategoriasFirebase] = useState<Categoria[]>([]);
  const [dadosLoja, setDadosLoja] = useState({ slug: "", logoUrl: "", celular: "", nomeLoja: "", redesSociais: [], tema: {}, banner1: "", banner2: "", banner3: "", linkBanner1: "", linkBanner2: "", linkBanner3: "" });
  const [lojistaId, setLojistaId] = useState<string | null>(null);

  const [subCatAberta, setSubCatAberta] = useState(null);
  const [bannerAtivo, setBannerAtivo] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ ESTADOS PARA CONTROLE DO MENU MOBILE SIDEBAR
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [catMobileExpandida, setCatMobileExpandida] = useState<string | null>(null);

  const banners = [
    { url: dadosLoja.banner1 || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1500", link: dadosLoja.linkBanner1 || "" },
    { url: dadosLoja.banner2 || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1500", link: dadosLoja.linkBanner2 || "" },
    { url: dadosLoja.banner3 || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1500", link: dadosLoja.linkBanner3 || "" }
  ];

  const renderIcone = (plataforma: string) => {
    switch (plataforma) {
      case 'instagram': return <FiInstagram size={18} />;
      case 'facebook': return <FiFacebook size={18} />;
      case 'tiktok': return <FaTiktok size={18} />;
      case 'youtube': return <FiYoutube size={18} />;
      default: return <FiGlobe size={18} />;
    }
  };

  useEffect(() => {
    async function carregarDono() {
      const slugUrl = params.slug || params.lojista;
      const q = query(collection(db, "lojistas"), where("slug", "==", slugUrl), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setLojistaId(docSnap.id);
        const d = docSnap.data();
        setDadosLoja({
          ...dadosLoja,
          ...d,
          slug: d.slug || "",
          logoUrl: d.logoUrl || "",
          celular: d.celular || "",
          nomeLoja: d.nomeLoja || d.slug,
          redesSociais: d.redesSociais || [],
          tema: d.tema || {}
        });
      }
    }
    carregarDono();
  }, [params.slug, params.lojista]);

  const resetarTemporizadorBanner = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setBannerAtivo((prev) => (prev + 1) % 3);
    }, 5000);
  };

  useEffect(() => {
    if (!lojistaId) return;

    const unsubCat = onSnapshot(collection(db, `lojistas/${lojistaId}/categorias`), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Categoria[];
      setCategoriasFirebase(cats);
    });

    const unsubProd = onSnapshot(collection(db, `lojistas/${lojistaId}/produtos`), (snapshot) => {
      // Transformamos os docs em um array de Produto[]
      const todos: Produto[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Produto));

      // O filtro continua funcionando normalmente com a tipagem correta
      const ativos = todos.filter((p) => p.ativo === true);
      setProdutos(ativos);
    });

    resetarTemporizadorBanner();

    return () => {
      unsubCat();
      unsubProd();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lojistaId]);

  const bannerAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerAtivo((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    resetarTemporizadorBanner();
  };

  const proximoBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerAtivo((prev) => (prev + 1) % banners.length);
    resetarTemporizadorBanner();
  };

  const navegarParaProduto = (prod: any) => {
    const lojista = params.slug || params.lojista;
    router.push(`/produto/${prod.id}?loja=${lojista}`);
  };

  const navegarParaCategoria = (catNome: string) => {
    setMenuMobileAberto(false); // Fecha o menu se clicar em mobile
    const lojista = params.slug || params.lojista;
    router.push(`/${lojista}/PagCategoria?cat=${encodeURIComponent(catNome)}`);
  };

  const navegarParaSubcategoria = (catNome: string, subNome: string) => {
    setMenuMobileAberto(false);
    const lojista = params.slug || params.lojista;
    router.push(`/${lojista}/PagCategoria?cat=${encodeURIComponent(catNome)}&sub=${encodeURIComponent(subNome)}`);
  };

  const produtosParaExibir = termoBusca
    ? produtos.filter((p: any) => p.nome.toLowerCase().includes(termoBusca.toLowerCase()))
    : produtos.filter((p: any) => p.destaque === true);

  const config = {
    nomeLoja: dadosLoja.nomeLoja || "Carregando...",
    corDestaque: (dadosLoja.tema as any)?.corPrincipal || "#FFCC80",
    corSecundaria: (dadosLoja.tema as any)?.corSecundaria || "#FDF5EB",
    corFundoSite: (dadosLoja.tema as any)?.corFundo || "#FFF9F2",
    corTextoCard: (dadosLoja.tema as any)?.corTextoCard || "#f30c0c",
    linkWhatsapp: `https://wa.me/${dadosLoja.celular?.replace(/\D/g, '')}`,
    backgroundPadrao: "white"
  };

  return (
    <div style={{ margin: 0, padding: 0, width: '100%', overflowX: 'hidden', backgroundColor: config.corFundoSite, fontFamily: 'sans-serif', position: 'relative' }}>

      <style jsx global>{`
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; overflow-x: hidden !important; position: relative; }
        * { box-sizing: border-box !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- HEADER DESKTOP INTELLIGENT --- */}
      <div className="desktop-header" style={{ position: 'relative', width: '100%', minHeight: '115px' }}>

        {/* Camada Estática das Cores de Fundo */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
          <div style={{ backgroundColor: config.corSecundaria, flex: 1, width: '100%' }}></div>
        </div>

        {/* BARRA LARANJA: Alinhamento de 3 colunas independentes */}
        <div style={{ position: 'absolute', width: '100%', height: '60px', top: 0, left: 0, zIndex: 25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>

          {/* ✅ BOTÃO SANDUÍCHE (VISÍVEL APENAS NO MOBILE/TABLET) */}
          <button className="botao-menu-mobile" onClick={() => setMenuMobileAberto(true)} aria-label="Abrir Menu">
            <FiMenu size={28} color="white" />
          </button>

          {/* Coluna 1 (Canto Esquerdo Desktop): Bloco Isolado da Logo + Nome */}
          <div className="logo-container-desktop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', minWidth: '180px' }} onClick={() => router.push(`/${params.slug || params.lojista}`)}>
            <div style={{ width: '90px', height: '90px', position: 'absolute', top: '15px', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '15px' }}>
              {dadosLoja.logoUrl ? <img src={dadosLoja.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" /> : "Logo"}
            </div>
            <span style={{ fontSize: '18px', color: 'white', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', letterSpacing: '1px', position: 'absolute', top: '109px', zIndex: 30 }}>
              {config.nomeLoja.toUpperCase()}
            </span>
          </div>

          {/* Coluna 2 (Centro Absoluto): Barra de Pesquisa Travada no Centro */}
          <div className="busca-container-header" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '420px', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Pesquisar produtos ativos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{ width: '100%', padding: '10px 40px 10px 20px', borderRadius: '25px', border: 'none', outline: 'none', fontSize: '14px' }}
            />
            <FiSearch style={{ position: 'absolute', right: '15px', color: '#888', fontSize: '18px' }} />
          </div>

          {/* Coluna 3 (Canto Direito): Redes Sociais e Carrinho */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px', minWidth: '180px', justifyContent: 'flex-end' }}>
            <div className="redes-desktop" style={{ display: 'flex', gap: '15px' }}>
              {dadosLoja.redesSociais && dadosLoja.redesSociais.map((rede: any, index: number) => (
                <a key={index} href={rede.url.startsWith('http') ? rede.url : `https://${rede.url}`} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                  {renderIcone(rede.plataforma)}
                </a>
              ))}
            </div>

            {/* Ícone do Carrinho de Compras */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push(`/${params.slug || params.lojista}/carrinho`)}>
              <span style={{ fontSize: '28px', color: 'white' }}>🛒</span>
              {cart.length > 0 && (
                <div style={{ position: 'absolute', top: '-6px', right: '-10px', backgroundColor: 'red', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {cart.reduce((acc, item) => acc + item.qty, 0)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Faixa Bege Desktop (Menu de Categorias tradicional - oculto no mobile) */}
        <div className="categorias-linha-desktop" style={{ position: 'relative', paddingTop: '78px', paddingBottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 25px', color: config.corTextoCard, fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', zIndex: 10, maxWidth: '850px', width: '95%', textAlign: 'center' }}>
          {categoriasFirebase.map((cat: any) => (
            <div key={cat.id} style={{ position: 'relative' }} onMouseEnter={() => setSubCatAberta(cat.id)} onMouseLeave={() => setSubCatAberta(null)}>
              <span style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => navegarParaCategoria(cat.nome)}>{cat.nome}</span>
              {subCatAberta === cat.id && cat.subcategorias && cat.subcategorias.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', border: '1px solid #ddd', padding: '10px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginTop: '5px', textTransform: 'none' }}>
                  {cat.subcategorias.map((sub: string, i: number) => (
                    <span key={i} onClick={() => navegarParaSubcategoria(cat.nome, sub)} style={{ cursor: 'pointer', color: '#555', fontWeight: 'normal', fontSize: '12px' }}>
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ✅ GAVETA LATERAL (SIDEBAR NAVIGATION MOBILE) */}
      {menuMobileAberto && (
        <div className="overlay-menu-mobile" onClick={() => setMenuMobileAberto(false)}>
          <div className="sidebar-menu-mobile" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header-mobile" style={{ backgroundColor: config.corDestaque }}>
              <span style={{ fontWeight: 'bold', color: 'white' }}>Navegação</span>
              <button onClick={() => setMenuMobileAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
                <FiX size={24} />
              </button>
            </div>

            <div className="sidebar-body-mobile">
              {categoriasFirebase.map((cat: any) => {
                const temSubs = cat.subcategorias && cat.subcategorias.length > 0;
                const estaExpandida = catMobileExpandida === cat.id;

                return (
                  <div key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' }}>
                      <span onClick={() => navegarParaCategoria(cat.nome)} style={{ cursor: 'pointer', fontWeight: 'bold', color: config.corTextoCard, textTransform: 'uppercase', fontSize: '14px' }}>
                        {cat.nome}
                      </span>
                      {temSubs && (
                        <button
                          onClick={() => setCatMobileExpandida(estaExpandida ? null : cat.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: config.corTextoCard }}
                        >
                          {estaExpandida ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                        </button>
                      )}
                    </div>

                    {/* Subcategorias Sanfona */}
                    {temSubs && estaExpandida && (
                      <div style={{ backgroundColor: '#fafafa', paddingLeft: '20px' }}>
                        {cat.subcategorias.map((sub: string, i: number) => (
                          <div
                            key={i}
                            onClick={() => navegarParaSubcategoria(cat.nome, sub)}
                            style={{ padding: '12px 20px', color: '#555', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                          >
                            {sub}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- BANNER CALIBRADO --- */}
      <div className="banner-container" style={{ width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Seta Esquerda */}
        <button className="seta-banner esq" onClick={bannerAnterior} aria-label="Banner Anterior">
          <FiChevronLeft size={36} />
        </button>

        {banners.map((b, idx) => (
          <div
            key={idx}
            onClick={() => b.link && navegarParaCategoria(b.link)}
            style={{
              position: bannerAtivo === idx ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url('${b.url}')`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transition: 'opacity 0.8s ease-in-out',
              opacity: bannerAtivo === idx ? 1 : 0,
              zIndex: bannerAtivo === idx ? 5 : 1,
              cursor: b.link ? 'pointer' : 'default'
            }}
          />
        ))}

        {/* Seta Direita */}
        <button className="seta-banner dir" onClick={proximoBanner} aria-label="Próximo Banner">
          <FiChevronRight size={36} />
        </button>
      </div>

      {/* --- FAIXA DE BENEFÍCIOS --- */}
      <div style={{ backgroundColor: 'white', padding: '15px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
        {[
          { icon: "📦", text: "CONFIRA OPÇÕES DE FRETE" },
          { icon: "📍", text: "ENVIAMOS PARA TODO BRASIL" },
          { icon: "💳", text: "PAGUE COM PIX" },
          { icon: "🏠", text: "FIQUE TRANQUILO E RECEBA EM CASA" }
        ].map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 'bold', color: '#555' }}>
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      {/* --- VITRINE --- */}
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <h2 style={{ color: config.corTextoCard, fontWeight: 'normal', fontSize: '20px', marginBottom: '30px' }}>
          {termoBusca ? `Resultados para: ${termoBusca}` : "Lançamentos que você vai amar"}
        </h2>
        <div className="grid-produtos">
          {produtosParaExibir.length > 0 ? produtosParaExibir.slice(0, 16).map((prod: Produto) => (
            <div key={prod.id} onClick={() => navegarParaProduto(prod)} className="card-produto" style={{ backgroundColor: 'white', padding: '10px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', height: '100%', position: 'relative' }}>
              <div>
                <img src={prod.capa || "https://via.placeholder.com/500"} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '8px' }} alt={prod.nome} />
                <p style={{ margin: '15px 0 5px', fontSize: '14px', color: config.corTextoCard, fontWeight: 'bold' }}>{prod.nome}</p>
                <p style={{ margin: '5px 0 15px', fontWeight: '900', fontSize: '18px', color: config.corTextoCard }}>R$ {prod.precoBasico || "0,00"}</p>
              </div>
              <button style={{ backgroundColor: config.corDestaque, border: 'none', width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', color: 'white' }}>Detalhes</button>
            </div>
          )) : (
            <p style={{ color: '#888', gridColumn: '1/-1' }}>Nenhum produto disponível no momento.</p>
          )}
        </div>
      </div>

      <footer style={{ backgroundColor: config.corDestaque, padding: '40px 20px', color: 'white', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{config.nomeLoja}</p>
        <p style={{ fontSize: '12px', opacity: 0.8 }}>© {new Date().getFullYear()} - Todos os direitos reservados.</p>
      </footer>

      <a href={config.linkWhatsapp} target="_blank" style={{ position: 'fixed', bottom: '25px', right: '25px', backgroundColor: '#25D366', color: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 9999, textDecoration: 'none' }}> 📞 </a>

      <style jsx>{`
        .desktop-header { display: flex; }
        .botao-menu-mobile { display: none; background: none; border: none; cursor: pointer; }
        
        .banner-container { 
          width: 100%; 
          aspect-ratio: 1920/800; 
          background-color: transparent;
          z-index: 5;
        }
        
        .grid-produtos { display: grid; grid-template-columns: repeat(4, 1fr); max-width: 1200px; margin: 0 auto; gap: 15px; padding: 0 15px; }
        .card-produto:hover { transform: scale(1.02); }
        
        .seta-banner {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.35);
          color: white;
          border: none;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: background 0.2s;
        }
        .seta-banner:hover { background: rgba(0, 0, 0, 0.6); }
        .seta-banner.esq { left: 20px; }
        .seta-banner.dir { right: 20px; }

        /* ✅ ESTILOS CSS DA GAVETA MOBILE */
        .overlay-menu-mobile {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 2000;
          display: flex;
        }
        .sidebar-menu-mobile {
          width: 280px;
          height: 100%;
          background-color: white;
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 10px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.3s ease-out;
        }
        .sidebar-header-mobile {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sidebar-body-mobile {
          flex: 1;
          overflow-y: auto;
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        /* SCREEN RESPONSIVO (CELULARES E TABLETS) */
        @media (max-width: 1024px) { 
          .categorias-linha-desktop, .logo-container-desktop, .redes-desktop { display: none !important; }
          .botao-menu-mobile { display: block !important; }
          .busca-container-header { width: 60% !important; }
          .grid-produtos { grid-template-columns: repeat(2, 1fr); } 
          .seta-banner { width: 38px; height: 38px; }
          .seta-banner.esq { left: 10px; }
          .seta-banner.dir { right: 10px; }
        }
      `}</style>
    </div>
  );
}