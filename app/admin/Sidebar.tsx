"use client";
import React, { useEffect, useState } from "react";
import { FiPieChart, FiPackage, FiShoppingCart, FiSettings, FiLogOut } from "react-icons/fi";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

export default function Sidebar({ telaAtiva, setTelaAtiva }) {
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: "Carregando...",
    logoUrl: null
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Puxa os dados da "pasta" raiz do lojista
        const docRef = doc(db, "lojistas", user.uid);
        
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDadosLoja({
              // Nome cadastrado no login (imutável no sidebar)
              nomeLoja: data.nomeLoja || "Minha Loja", 
              // Logo que pode ser alterada nas configurações
              logoUrl: data.logoUrl || null 
            });
          }
        });
        return () => unsubDoc();
      }
    });
    return () => unsubAuth();
  }, []);

  const menuItens = [
    { id: 'dash', label: 'Dashboard', icon: <FiPieChart /> },
    { id: 'produtos', label: 'Produtos', icon: <FiPackage /> },
    { id: 'pedidos', label: 'Pedidos', icon: <FiShoppingCart /> },
    { id: 'config', label: 'Configurações', icon: <FiSettings /> },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* SEÇÃO DA LOGO E NOME (Topo do Sidebar) */}
      <div style={styles.brandArea}>
        <div style={styles.logoContainer}>
          {dadosLoja.logoUrl ? (
            <img src={dadosLoja.logoUrl} alt="Logo da Loja" style={styles.logoImg} />
          ) : (
            <div style={styles.logoPlaceholder}>
              {dadosLoja.nomeLoja.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 style={styles.storeName}>{dadosLoja.nomeLoja}</h2>
      </div>

      {/* NAVEGAÇÃO */}
      <nav style={styles.nav}>
        {menuItens.map((item) => (
          <button
            key={item.id}
            onClick={() => setTelaAtiva(item.id)}
            style={{
              ...styles.navBtn,
              background: telaAtiva === item.id ? '#334155' : 'transparent',
              color: telaAtiva === item.id ? '#fdb813' : '#94a3b8'
            }}
          >
            {item.icon}
            <span style={{ marginLeft: '12px' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <button onClick={() => signOut(auth)} style={styles.logoutBtn}>
        <FiLogOut /> <span style={{ marginLeft: '12px' }}>Sair</span>
      </button>
    </aside>
  );
}

const styles = {
  sidebar: { 
    width: '260px', 
    background: '#1e293b', 
    color: '#fff', 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    position: 'sticky', 
    top: 0 
  },
  brandArea: {
    padding: '40px 20px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    marginBottom: '10px'
  },
  logoContainer: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '3px solid #fdb813',
    marginBottom: '15px'
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  logoPlaceholder: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fdb813'
  },
  storeName: {
    fontSize: '18px',
    color: '#fff',
    margin: 0,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  nav: { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' },
  navBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    padding: '12px 15px', 
    borderRadius: '8px', 
    border: 'none', 
    cursor: 'pointer', 
    fontSize: '15px', 
    transition: '0.2s' 
  },
  logoutBtn: { 
    padding: '20px', 
    border: 'none', 
    background: 'none', 
    color: '#ef4444', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center',
    borderTop: '1px solid #334155'
  }
};