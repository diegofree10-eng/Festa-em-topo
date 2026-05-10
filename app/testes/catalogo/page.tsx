"use client";
import React, { useState } from 'react';

export default function PaginaFinal() {
  const [aberto, setAberto] = useState(false);

  // --- CONFIGURAÇÕES PARA O LOJISTA PERSONALIZAR ---
  const config = {
    nomeLoja: "Nome Loja",
    corDestaque: "#FFCC80",    // Cor das faixas (Laranja)
    corFundoSite: "#FFF9F2",   // Cor de fundo geral (Creme)
    corTextoDestaque: "#8B5E3C", // Cor dos ícones e textos do menu (Marrom)
    imagemBanner: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1500",
    linkWhatsapp: "https://wa.me/seunumerodetel",
    backgroundPadrao: "white"  // Cor de fundo de elementos como Header e Vitrine
  };

  const categorias = ["Página Inicial", "Sobre", "Loja", "Campanha", "Guia de Tamanhos", "Contato"];

  return (
    <div style={{ margin: 0, padding: 0, width: '100%', overflowX: 'hidden', backgroundColor: config.corFundoSite, fontFamily: 'sans-serif', position: 'relative' }}>
      
      {/* CSS GLOBAL PARA MATAR O SCROLL HORIZONTAL */}
      <style jsx global>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          overflow-x: hidden !important;
          position: relative;
        }
        * { box-sizing: border-box !important; }
      `}</style>

      {/* --- MENU LATERAL (DRAWER) MOBILE --- */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: aberto ? 0 : '-100%',
        width: '80%',
        height: '100vh',
        backgroundColor: 'white',
        zIndex: 10000,
        transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '20px',
        boxShadow: '10px 0 30px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ textAlign: 'right', fontSize: '30px', cursor: 'pointer', marginBottom: '20px' }} onClick={() => setAberto(false)}>✕</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {categorias.map(cat => (
            <span key={cat} style={{ fontSize: '18px', fontWeight: 'bold', color: config.corTextoDestaque, borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
              {cat}
            </span>
          ))}
        </nav>
      </div>

      {/* Fundo escuro quando menu abre */}
      {aberto && (
        <div 
          onClick={() => setAberto(false)} 
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} 
        />
      )}

      {/* --- HEADER DESKTOP --- */}
      <div className="desktop-header" style={{ position: 'relative', width: '100%', height: '115px' }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}>
          <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
          <div style={{ backgroundColor: '#fdf5eb', height: '55px', width: '100%' }}></div>
        </div>
        <div style={{ position: 'absolute', left: '40px', top: '15px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ border: '1px solid black', padding: '30px 15px', fontWeight: 'bold', fontSize: '20px', backgroundColor: 'white' }}>Logo</div>
          <span style={{ fontSize: '22px', color: 'white', fontWeight: 'bold' }}>{config.nomeLoja}</span>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '15px', transform: 'translateX(-50%)', width: '400px', zIndex: 10 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input type="text" style={{ width: '100%', borderRadius: '20px', border: 'none', padding: '6px 40px 6px 15px', outline: 'none' }} />
            <span style={{ position: 'absolute', right: '15px', top: '5px' }}>🔍</span>
          </div>
        </div>
        <div style={{ position: 'absolute', right: '60px', top: '60px', zIndex: 10 }}>
          <span style={{ fontSize: '30px', cursor: 'pointer', color: 'white' }}>🛒</span>
        </div>
        <div style={{ position: 'absolute', top: '78px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '25px', color: config.corTextoDestaque, fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold', textTransform: 'uppercase', zIndex: 10 }}>
          {categorias.map(cat => <span key={cat}>{cat}</span>)}
        </div>
      </div>

      {/* --- HEADER MOBILE --- */}
      <div className="mobile-header">
        <div style={{ backgroundColor: config.backgroundPadrao, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <div style={{ border: '1px solid black', padding: '5px 10px', fontWeight: 'bold' }}>Logo</div>
          <span style={{ fontSize: '18px', fontWeight: '500' }}>{config.nomeLoja}</span>
        </div>
        
        <div style={{ backgroundColor: config.corDestaque, height: '60px', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 15px', width: '100%' }}>
          <span onClick={() => setAberto(true)} style={{ fontSize: '30px', color: config.corTextoDestaque, position: 'absolute', left: '15px', cursor: 'pointer' }}>☰</span>
          
          <div style={{ width: '60%', margin: '0 auto', position: 'relative' }}>
            <input type="text" style={{ width: '100%', borderRadius: '25px', border: 'none', padding: '8px 15px', fontSize: '14px' }} />
            <span style={{ position: 'absolute', right: '12px', top: '8px' }}>🔍</span>
          </div>
          <span style={{ fontSize: '26px', position: 'absolute', right: '15px' }}>🛒</span>
        </div>
      </div>

      {/* --- BANNER --- */}
      <div style={{ 
        width: '100%', height: '50vh', 
        backgroundImage: `url('${config.imagemBanner}')`, 
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center', padding: '0 20px'
      }}>
        <p style={{ fontSize: '16px' }}>As últimas tendências estão aqui</p>
        <h1 style={{ fontSize: 'clamp(32px, 10vw, 85px)', margin: '10px 0', letterSpacing: '4px', fontWeight: 'normal' }}>LIDO BRANCO</h1>
        <a href="#" style={{ color: 'white', fontSize: '18px', textDecoration: 'underline' }}>Comprar agora!</a>
      </div>

      {/* --- AS 4 INFORMAÇÕES --- */}
      <div className="info-bar" style={{ backgroundColor: config.backgroundPadrao, borderBottom: '1px solid #eee' }}>
        <div className="info-container" style={{ display: 'flex', padding: '20px' }}>
          <div className="info-item">📦 CONFIRA OPÇÕES DE FRETE</div>
          <div className="info-item">📍 ENVIAMOS PARA TODO BRASIL</div>
          <div className="info-item">💳 PAGUE COM PIX</div>
          <div className="info-item">👍 FIQUE TRANQUILO E RECEBA EM CASA</div>
        </div>
      </div>

      {/* --- VITRINE --- */}
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <h2 style={{ color: config.corTextoDestaque, fontWeight: 'normal', fontSize: '20px', marginBottom: '30px' }}>Lançamentos que você vai amar</h2>
        <div className="grid-produtos">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <img src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=500" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} />
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#888' }}>Tamarinho</p>
              <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px' }}>R$ 109,00</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- RODAPÉ --- */}
      <div style={{ backgroundColor: config.corDestaque, padding: '20px', textAlign: 'center', width: '100%', fontWeight: 'bold', fontSize: '14px' }}>
        icones das redes sociais
      </div>

      {/* BOTÃO WHATSAPP FLUTUANTE */}
      <a 
        href={config.linkWhatsapp} 
        target="_blank" 
        style={{
          position: 'fixed',
          bottom: '25px',
          right: '25px',
          backgroundColor: '#25D366',
          color: 'white',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          textDecoration: 'none'
        }}
      >
        📞
      </a>

      <style jsx>{`
        .mobile-header { display: flex; flex-direction: column; width: 100%; }
        .desktop-header { display: none; }
        .grid-produtos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 0 15px; width: 100%; box-sizing: border-box; }
        .info-container { flex-direction: column; gap: 15px; align-items: center; text-align: center; }
        .info-item { font-size: 11px; font-weight: bold; }

        @media (min-width: 1024px) {
          .mobile-header { display: none; }
          .desktop-header { display: flex; }
          .grid-produtos { grid-template-columns: repeat(4, 1fr); max-width: 1200px; margin: 0 auto; }
          .info-container { flex-direction: row; justify-content: space-around; padding: 25px 5%; }
          .info-item { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}