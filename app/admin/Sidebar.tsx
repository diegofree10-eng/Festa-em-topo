"use client";
import React, { useEffect, useState } from "react";
import { FiPieChart, FiPackage, FiShoppingCart, FiSettings, FiLogOut, FiShield } from "react-icons/fi";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

interface SidebarProps {
  telaAtiva: string;
  setTelaAtiva: (tela: string) => void;
}

export default function Sidebar({ telaAtiva, setTelaAtiva }: SidebarProps) {
  const [role, setRole] = useState<string | null>(null);
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: "Carregando...",
    logoUrl: null
  });

  // Referência para limpar o listener da loja ao deslogar ou mudar de usuário
  const unsubRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Primeiro buscamos o Role para garantir autorização no Firestore
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          
          if (userDoc.exists()) {
            const userRole = userDoc.data().role;
            setRole(userRole);

            // 2. Só iniciamos a escuta (onSnapshot) após confirmar o login e papel
            // Isso evita o erro de permissão negada no carregamento inicial
            const docRef = doc(db, "lojistas", user.uid);
            
            // Cancela listener anterior se existir
            if (unsubRef.current) unsubRef.current();

            unsubRef.current = onSnapshot(docRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setDadosLoja({
                  nomeLoja: data.nomeLoja || "Minha Loja",
                  logoUrl: data.logoUrl || null
                });
              }
            }, (error) => {
              // Log silencioso se for erro de permissão temporário no HMR
              if (error.code !== 'permission-denied') {
                console.error("Erro ao escutar lojista:", error);
              }
            });
          }
        } catch (error) {
          console.error("Erro ao validar permissões:", error);
        }
      } else {
        // Limpeza total ao sair
        if (unsubRef.current) unsubRef.current();
        setRole(null);
        setDadosLoja({ nomeLoja: "Acesso Negado", logoUrl: null });
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
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      } catch (error) {
        console.error("Erro ao sair:", error);
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

        {/* ACESSO MASTER - VISÍVEL APENAS PARA ROLE MASTER */}
        {role === 'master' && (
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
    display: 'flex', 
    alignItems: 'center', 
    padding: '12px 15px', 
    borderRadius: '8px', 
    border: 'none', 
    cursor: 'pointer', 
    fontSize: '15px', 
    width: '100%', 
    transition: 'all 0.2s',
    textAlign: 'left'
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