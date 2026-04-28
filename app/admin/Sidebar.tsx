"use client";
import React, { useEffect, useState } from "react";
import { FiPieChart, FiPackage, FiShoppingCart, FiSettings, FiLogOut, FiShield } from "react-icons/fi";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

interface SidebarProps {
  telaAtiva: string;
  setTelaAtiva: (tela: string) => void;
  userRole?: string;
}

export default function Sidebar({ telaAtiva, setTelaAtiva, userRole }: SidebarProps) {
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: "Carregando...",
    logoUrl: null
  });

  const unsubRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const docRef = doc(db, "lojistas", user.uid);
        
        unsubRef.current = onSnapshot(docRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setDadosLoja({
                nomeLoja: data.nomeLoja || "Minha Loja", 
                logoUrl: data.logoUrl || null 
              });
            }
          },
          (error) => {
            if (error.code === "permission-denied" || error.code === "failed-precondition") {
              return;
            }
            console.error("Erro ao buscar dados da loja:", error);
          }
        );
      } else {
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      try {
        // 1. Corta a conexão com o Firestore imediatamente
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }

        // 2. Redireciona para a página de LOGIN (app/login)
        window.location.replace("/login"); 

        // 3. Desloga do Firebase após o redirecionamento iniciar
        setTimeout(async () => {
          await signOut(auth);
        }, 100);

      } catch (error) {
        console.error("Erro ao sair:", error);
        window.location.replace("/login");
      }
    }
  };

  const menuItens = [
    { id: 'dash', label: 'Dashboard', icon: <FiPieChart /> },
    { id: 'produtos', label: 'Produtos', icon: <FiPackage /> },
    { id: 'pedidos', label: 'Pedidos', icon: <FiShoppingCart /> },
    { id: 'config', label: 'Configurações', icon: <FiSettings /> },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandArea}>
        <div style={styles.logoContainer}>
          {dadosLoja.logoUrl ? (
            <img src={dadosLoja.logoUrl} alt="Logo" style={styles.logoImg} />
          ) : (
            <div style={styles.logoPlaceholder}>
              {dadosLoja.nomeLoja.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 style={styles.storeName}>{dadosLoja.nomeLoja}</h2>
      </div>

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

        {/* Botão Master - Mantido exatamente como o original */}
        {userRole === 'master' && (
          <button
            onClick={() => setTelaAtiva('gestao-geral')}
            style={{
              ...styles.navBtn,
              marginTop: '10px',
              border: '1px solid #fdb813',
              background: telaAtiva === 'gestao-geral' ? '#334155' : 'transparent',
              color: '#fdb813'
            }}
          >
            <FiShield />
            <span style={{ marginLeft: '12px' }}>Gestão Geral</span>
          </button>
        )}
      </nav>

      <button onClick={handleLogout} style={styles.logoutBtn}>
        <FiLogOut /> 
        <span style={{ marginLeft: '12px' }}>Sair do Sistema</span>
      </button>
    </aside>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
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
    width: '105px',
    height: '105px',
    borderRadius: '12px',
    background: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '3px solid #fdb813',
    marginBottom: '15px'
  },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoPlaceholder: { fontSize: '36px', fontWeight: 'bold', color: '#fdb813' },
  storeName: { fontSize: '18px', color: '#fff', textAlign: 'center', fontWeight: '600' },
  nav: { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' },
  navBtn: { 
    display: 'flex', alignItems: 'center', padding: '12px 15px', 
    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', width: '100%'
  },
  logoutBtn: { 
    padding: '20px', 
    border: 'none', 
    background: 'none', 
    color: '#ef4444', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center',
    justifyContent: 'center',
    borderTop: '1px solid #334155',
    width: '100%',
    fontWeight: 'bold',
    fontSize: '15px'
  }
};