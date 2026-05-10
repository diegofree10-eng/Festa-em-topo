"use client";
import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, getDocs, limit } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { FiInstagram, FiFacebook, FiYoutube, FiGlobe } from "react-icons/fi";
import { FaTiktok } from "react-icons/fa";

export default function PaginaFinal() {
  const params = useParams();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  
  const [produtos, setProdutos] = useState([]);
  const [categoriasFirebase, setCategoriasFirebase] = useState([]);
  const [dadosLoja, setDadosLoja] = useState({ slug: "", logoUrl: "", celular: "", nomeLoja: "", redesSociais: [], tema: {} });
  const [lojistaId, setLojistaId] = useState(null);
  const [carrinhoCount, setCarrinhoCount] = useState(0);

  const [subCatAberta, setSubCatAberta] = useState(null);

  const [bannerAtivo, setBannerAtivo] = useState(0);
  const banners = [
    dadosLoja.banner1 || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1500",
    dadosLoja.banner2 || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1500",
    dadosLoja.banner3 || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1500"
  ];

  const renderIcone = (plataforma) => {
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
          ...d,
          slug: d.slug || "",
          logoUrl: d.logoUrl || "",
          celular: d.celular || "",
          nomeLoja: d.nomeLoja || d.slug,
          redesSociais: d.redesSociais || [],
          tema: d.tema || {} // Captura o tema salvo
        });
      }
    }
    carregarDono();
    atualizarContadorCarrinho();
  }, [params.slug, params.lojista]);

  useEffect(() => {
    if (!lojistaId) return;

    const unsubCat = onSnapshot(collection(db, `lojistas/${lojistaId}/categorias`), (snapshot) => {
      const listaCategorias = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategoriasFirebase(listaCategorias);
    });

    const unsubProd = onSnapshot(collection(db, `lojistas/${lojistaId}/produtos`), (snapshot) => {
      const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProdutos(todos.filter(p => p.destaque === true));
    });

    const timer = setInterval(() => {
      setBannerAtivo((prev) => (prev + 1) % 3);
    }, 5000);

    return () => { unsubCat(); unsubProd(); clearInterval(timer); };
  }, [lojistaId]);

  const atualizarContadorCarrinho = () => {
    const salvo = localStorage.getItem(`carrinho_${params.slug || params.lojista}`);
    if (salvo) {
      const itens = JSON.parse(salvo);
      const total = itens.reduce((acc, item) => acc + item.quantidade, 0);
      setCarrinhoCount(total);
    }
  };

  const adicionarAoCarrinho = (e, produto) => {
    e.stopPropagation();
    const key = `carrinho_${params.slug || params.lojista}`;
    const salvo = localStorage.getItem(key);
    let itens = salvo ? JSON.parse(salvo) : [];
    const index = itens.findIndex(i => i.id === produto.id);
    if (index > -1) {
      itens[index].quantidade += 1;
    } else {
      itens.push({ ...produto, quantidade: 1 });
    }
    localStorage.setItem(key, JSON.stringify(itens));
    atualizarContadorCarrinho();
    alert("Produto adicionado!");
  };

  const navegarParaProduto = (id) => {
    router.push(`/${params.slug || params.lojista}/produto/${id}`);
  };

  // --- LÓGICA DE PERSONALIZAÇÃO APLICADA AQUI ---
  const config = {
    nomeLoja: dadosLoja.nomeLoja || "Carregando...",
    corDestaque: dadosLoja.tema?.corPrincipal || "#FFCC80",    
    corSecundaria: dadosLoja.tema?.corSecundaria || "#FDF5EB", 
    corFundoSite: dadosLoja.tema?.corFundo || "#FFF9F2",   
    corTextoCard: dadosLoja.tema?.corTextoCard || "#8B5E3C", 
    linkWhatsapp: `https://wa.me/${dadosLoja.celular.replace(/\D/g, '')}`,
    backgroundPadrao: "white"  
  };

  const navegarParaCategoria = (catNome) => {
    const lojista = params.slug || params.lojista;
    router.push(`/${lojista}/PagCategoria?cat=${catNome}`);
  };

  return (
    <div style={{ margin: 0, padding: 0, width: '100%', overflowX: 'hidden', backgroundColor: config.corFundoSite, fontFamily: 'sans-serif', position: 'relative' }}>
      
      <style jsx global>{`
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; overflow-x: hidden !important; position: relative; }
        * { box-sizing: border-box !important; }
      `}</style>

      {/* --- MENU LATERAL MOBILE --- */}
      <div style={{ position: 'fixed', top: 0, left: aberto ? 0 : '-100%', width: '80%', height: '100vh', backgroundColor: 'white', zIndex: 10000, transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', padding: '20px', boxShadow: '10px 0 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'right', fontSize: '30px', cursor: 'pointer', marginBottom: '20px' }} onClick={() => setAberto(false)}>✕</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {categoriasFirebase.map(cat => (
            <div key={cat.id}>
                <span onClick={() => { setAberto(false); navegarParaCategoria(cat.nome); }} style={{ fontSize: '18px', fontWeight: 'bold', color: config.corTextoCard, borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', cursor: 'pointer', display: 'block' }}>{cat.nome}</span>
            </div>
          ))}
        </nav>
      </div>

      {aberto && ( <div onClick={() => setAberto(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} /> )}

      {/* --- HEADER DESKTOP --- */}
      <div className="desktop-header" style={{ position: 'relative', width: '100%', height: '115px' }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}>
          <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
          <div style={{ backgroundColor: config.corSecundaria, height: '55px', width: '100%' }}></div>
        </div>

        <div style={{ position: 'absolute', right: '60px', top: '18px', zIndex: 20, display: 'flex', gap: '15px' }}>
            {dadosLoja.redesSociais && dadosLoja.redesSociais.map((rede, index) => (
                <a key={index} href={rede.url.startsWith('http') ? rede.url : `https://${rede.url}`} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                    {renderIcone(rede.plataforma)}
                </a>
            ))}
        </div>

        <div style={{ position: 'absolute', left: '40px', top: '15px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ border: '1px solid black', width: '90px', height: '90px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {dadosLoja.logoUrl ? <img src={dadosLoja.logoUrl} style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : "Logo"}
          </div>
          <span style={{ fontSize: '22px', color: 'white', fontWeight: 'bold' }}>{config.nomeLoja}</span>
        </div>
        
        <div style={{ position: 'absolute', top: '78px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '25px', color: config.corTextoCard, fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold', textTransform: 'uppercase', zIndex: 10 }}>
          {categoriasFirebase.length > 0 ? categoriasFirebase.map(cat => ( 
            <div 
              key={cat.id} 
              style={{ position: 'relative' }}
              onMouseEnter={() => setSubCatAberta(cat.id)}
              onMouseLeave={() => setSubCatAberta(null)}
            >
                <span style={{cursor: 'pointer'}} onClick={() => navegarParaCategoria(cat.nome)}>{cat.nome}</span>
                
                {subCatAberta === cat.id && cat.subcategorias && cat.subcategorias.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: '0', backgroundColor: 'white', border: '1px solid #ddd', padding: '10px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginTop: '5px', textTransform: 'none' }}>
                        {cat.subcategorias.map((sub, i) => (
                            <span 
                                key={i} 
                                onClick={() => router.push(`/${params.slug || params.lojista}/PagCategoria?cat=${cat.nome}&sub=${sub}`)}
                                style={{ cursor: 'pointer', color: '#555', fontWeight: 'normal', fontSize: '12px' }}
                                onMouseOver={(e) => e.currentTarget.style.color = config.corTextoCard}
                                onMouseOut={(e) => e.currentTarget.style.color = '#555'}
                            >
                                {sub}
                            </span>
                        ))}
                    </div>
                )}
            </div>
          )) : <span style={{cursor: 'pointer'}} onClick={() => navegarParaCategoria("Início")}>INÍCIO</span>}
        </div>

        <div style={{ position: 'absolute', right: '60px', top: '60px', zIndex: 10, cursor: 'pointer' }} onClick={() => router.push(`/${params.slug || params.lojista}/carrinho`)}>
          <span style={{ fontSize: '30px', color: config.corTextoCard }}>🛒</span>
          {carrinhoCount > 0 && (
            <div style={{ position: 'absolute', top: '-5px', right: '-10px', backgroundColor: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {carrinhoCount}
            </div>
          )}
        </div>
      </div>

      {/* --- HEADER MOBILE --- */}
      <div className="mobile-header">
        <div style={{ backgroundColor: config.backgroundPadrao, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <div style={{ border: '1px solid black', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', overflow: 'hidden' }}>
            {dadosLoja.logoUrl ? <img src={dadosLoja.logoUrl} style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : <b style={{fontSize: '10px'}}>Logo</b>}
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500' }}>{config.nomeLoja}</span>
        </div>
        <div style={{ backgroundColor: config.corDestaque, height: '60px', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 15px', width: '100%' }}>
          <span onClick={() => setAberto(true)} style={{ fontSize: '30px', color: 'white', cursor: 'pointer' }}>☰</span>
          <div style={{ width: '60%', margin: '0 auto', position: 'relative' }}>
            <input type="text" placeholder="Buscar..." style={{ width: '100%', borderRadius: '25px', border: 'none', padding: '8px 15px', fontSize: '14px' }} />
          </div>
          <div onClick={() => router.push(`/${params.slug || params.lojista}/carrinho`)} style={{ position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: '26px', color: 'white' }}>🛒</span>
            {carrinhoCount > 0 && (
              <div style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'red', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {carrinhoCount}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- BANNER ITINERANTE --- */}
      <div style={{ width: '100%', height: '60vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center' }}>
        {banners.map((img, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url('${img}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'opacity 1s ease-in-out',
              opacity: bannerAtivo === idx ? 1 : 0,
              zIndex: bannerAtivo === idx ? 1 : 0
            }}
          />
        ))}
        <div style={{ position: 'relative', zIndex: 10, padding: '0 20px' }}>
          <p style={{ fontSize: '16px', textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>As últimas tendências estão aqui</p>
          <h1 style={{ fontSize: 'clamp(32px, 10vw, 85px)', margin: '10px 0', letterSpacing: '4px', fontWeight: 'normal', textShadow: '2px 2px 8px rgba(0,0,0,0.5)' }}>
            {config.nomeLoja.toUpperCase()}
          </h1>
        </div>
      </div>

      {/* --- VITRINE --- */}
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <h2 style={{ color: config.corTextoCard, fontWeight: 'normal', fontSize: '20px', marginBottom: '30px' }}>Lançamentos que você vai amar</h2>
        <div className="grid-produtos">
          {produtos.map((prod) => (
            <div key={prod.id} onClick={() => navegarParaProduto(prod.id)} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
              <img src={prod.capa || "https://via.placeholder.com/500"} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '5px' }} />
              <p style={{ margin: '10px 0 0', fontSize: '13px', color: config.corTextoCard, fontWeight: '500' }}>{prod.nome}</p>
              <p style={{ margin: '5px 0', fontWeight: 'bold', fontSize: '16px', color: config.corTextoCard }}>R$ {prod.precoBasico || "0,00"}</p>
              <button onClick={(e) => adicionarAoCarrinho(e, prod)} style={{ backgroundColor: config.corDestaque, border: 'none', width: '100%', padding: '8px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', color: 'white' }}>ADICIONAR</button>
            </div>
          ))}
        </div>
      </div>

      {/* --- RODAPÉ DINÂMICO --- */}
      <footer style={{ backgroundColor: config.corDestaque, padding: '40px 20px', color: 'white', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '24px', marginBottom: '15px' }}>
            {dadosLoja.redesSociais && dadosLoja.redesSociais.map((rede, index) => (
                <a key={index} href={rede.url.startsWith('http') ? rede.url : `https://${rede.url}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {renderIcone(rede.plataforma)}
                </a>
            ))}
        </div>
        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{config.nomeLoja}</p>
        <p style={{ fontSize: '12px', opacity: 0.8 }}>© {new Date().getFullYear()} - Todos os direitos reservados.</p>
      </footer>

      <a href={config.linkWhatsapp} target="_blank" style={{ position: 'fixed', bottom: '25px', right: '25px', backgroundColor: '#25D366', color: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 9999, textDecoration: 'none' }}> 📞 </a>

      <style jsx>{`
        .mobile-header { display: flex; flex-direction: column; width: 100%; }
        .desktop-header { display: none; }
        .grid-produtos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 0 15px; }
        @media (min-width: 1024px) {
          .mobile-header { display: none; }
          .desktop-header { display: flex; }
          .grid-produtos { grid-template-columns: repeat(4, 1fr); max-width: 1200px; margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}