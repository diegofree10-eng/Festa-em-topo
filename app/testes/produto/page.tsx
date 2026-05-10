"use client";
import React, { useState, useEffect } from 'react';

export default function PaginaBlindadaComWhatsapp() {
  const [aberto, setAberto] = useState(false);
  const [produtos, setProdutos] = useState([
    { id: 1, nome: "Produto Exemplo", preco: "120,00" },
    { id: 2, nome: "Produto Exemplo", preco: "150,00" },
    { id: 3, nome: "Produto Exemplo", preco: "90,00" },
    { id: 4, nome: "Produto Exemplo", preco: "200,00" },
  ]);

  const categorias = ["Página Inicial", "Sobre", "Loja", "Contato"];

  // Cores vindas do seu Firebase (Exemplo)
  const corPrimaria = "#FFCC80"; 
  const linkWhatsapp = "https://wa.me/5511999999999"; 

  useEffect(() => {
    // Força o navegador a esquecer qualquer scroll horizontal anterior
    const travarLayout = () => {
      document.documentElement.style.overflowX = 'hidden';
      document.body.style.overflowX = 'hidden';
      document.body.style.width = '100%';
    };

    travarLayout();
    window.addEventListener('scroll', travarLayout);
    return () => window.removeEventListener('scroll', travarLayout);
  }, []);

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. RESET GLOBAL DE CSS - APLICADO NA RAIZ */}
      <style jsx global>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
          background-color: #FFF9F2;
          position: relative;
        }
        * { box-sizing: border-box !important; }

        /* Fundo isolado para não criar barra de rolagem */
        .fundo-fixo {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: url('https://www.transparenttextures.com/patterns/pinstriped-suit.png');
          z-index: -1;
          pointer-events: none;
        }
      `}</style>

      <div className="fundo-fixo" />

      {/* 2. MENU MOBILE (DRAWER) */}
      <div style={{
        position: 'fixed', top: 0, left: aberto ? 0 : '-100%',
        width: '280px', height: '100vh', backgroundColor: 'white',
        zIndex: 10000, transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '20px', boxShadow: '5px 0 15px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'right', fontSize: '30px', cursor: 'pointer' }} onClick={() => setAberto(false)}>✕</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '30px' }}>
          {categorias.map(cat => (
            <span key={cat} style={{ fontSize: '18px', fontWeight: 'bold', color: '#8B5E3C', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              {cat}
            </span>
          ))}
        </div>
      </div>
      {aberto && <div onClick={() => setAberto(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999 }} />}

      {/* 3. HEADER */}
      <header style={{ width: '100%', position: 'relative', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
          <b style={{ letterSpacing: '2px' }}>NOME DA LOJA</b>
        </div>
        
        <div style={{ backgroundColor: corPrimaria, height: '60px', display: 'flex', alignItems: 'center', padding: '0 15px' }}>
          <span onClick={() => setAberto(true)} style={{ fontSize: '30px', color: '#8B5E3C', cursor: 'pointer' }}>☰</span>
          <div style={{ flex: 1, margin: '0 15px' }}>
            <input type="text" placeholder="Buscar..." style={{ width: '100%', borderRadius: '20px', border: 'none', padding: '8px 15px', outline: 'none' }} />
          </div>
          <span style={{ fontSize: '25px' }}>🛒</span>
        </div>
      </header>

      {/* 4. VITRINE */}
      <main style={{ width: '100%', padding: '20px 10px' }}>
        <div className="grid-produtos">
          {produtos.map(p => (
            <div key={p.id} style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ width: '100%', aspectRatio: '1', backgroundColor: '#eee', borderRadius: '4px' }} />
              <p style={{ fontWeight: 'bold', marginTop: '10px', color: '#333' }}>{p.nome}</p>
              <p style={{ color: '#8B5E3C', fontWeight: 'bold' }}>R$ {p.preco}</p>
            </div>
          ))}
        </div>
      </main>

      {/* 5. BOTÃO WHATSAPP FLUTUANTE */}
      <a 
        href={linkWhatsapp} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          backgroundColor: '#25D366', color: 'white',
          width: '60px', height: '60px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '35px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          zIndex: 9999, textDecoration: 'none'
        }}
      >
        <span style={{ marginBottom: '5px' }}>📞</span>
      </a>

      <style jsx>{`
        .grid-produtos { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 15px; 
          width: 100%; 
        }
        @media (min-width: 1024px) {
          .grid-produtos { grid-template-columns: repeat(4, 1fr); max-width: 1200px; margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}