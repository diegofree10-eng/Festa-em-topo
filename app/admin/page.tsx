"use client";
import React, { useState, useEffect, CSSProperties } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore"; // Adicionei updateDoc
import { onAuthStateChanged, signOut } from "firebase/auth";

import Sidebar from "./Sidebar"; 
import DashboardGestao from "./DashboardGestao"; 
import DashboardBronze from "./DashboardBronze"; 
import CadastroProdutos from "./produtos/page";
import Pedidos from "./pedidos/page"; 
import AdminConfig from "./config/page"; 
import GestaoGeral from "./components/GestaoGeral"; 

function AdminContent() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dadosLojista, setDadosLojista] = useState<any>(null);
  const [planoConfig, setPlanoConfig] = useState<any>(null);
  const [isSuspenso, setIsSuspenso] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const role = userSnap.data().role;
          setUserRole(role);

          // Escuta em tempo real o documento do lojista
          onSnapshot(doc(db, "lojistas", user.uid), async (snapLoja) => {
            if (snapLoja.exists()) {
              const dados = snapLoja.data();
              
              // --- REGISTRO DE ÚLTIMO LOGIN ---
              // Só atualiza se o usuário logado não for o Master (para evitar loops)
              // E usamos um controle simples para não atualizar a cada mudança de estado
              if (role !== 'master') {
                const agora = new Date().toISOString();
                // Atualiza apenas se o último login for de um dia/hora diferente (evita excesso de escritas)
                await updateDoc(doc(db, "lojistas", user.uid), {
                  ultimoLogin: agora
                });
              }

              // Verifica status de suspensão
              if (dados.status === "suspenso") {
                setIsSuspenso(true);
                setLoading(false);
                return;
              } else {
                setIsSuspenso(false);
              }

              setDadosLojista(dados);
              
              // Busca definições de plano
              onSnapshot(doc(db, "configuracoes", "planos"), (snapPlanos) => {
                if (snapPlanos.exists()) {
                  const configs = snapPlanos.data();
                  setPlanoConfig(configs[dados.plano]);
                }
                setLoading(false);
              });
            } else {
              setLoading(false);
            }
          });
        }
      } catch (error: any) {
        console.error("Erro ao validar:", error.message);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (isSuspenso) {
    return (
      <div style={styles.blockOverlay}>
        <div style={styles.blockCard}>
          <span style={{ fontSize: '50px' }}>⚠️</span>
          <h2 style={{ color: '#ef4444', fontWeight: 900, marginTop: '10px' }}>LOJA SUSPENSA</h2>
          <p style={{ color: '#64748b', margin: '20px 0', lineHeight: '1.5' }}>
            Esta loja foi suspensa temporariamente. <br />
            Para regularizar sua situação, entre em contato com o suporte.
          </p>
          <button 
            onClick={() => { signOut(auth); window.location.href = "/login"; }} 
            style={styles.btnSair}
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loader}>Validando Assinatura...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} userRole={userRole} />
      
      <main style={{ flex: 1, overflowY: "auto", height: "100vh" }}>
        {telaAtiva === 'dash' && (
          planoConfig?.modeloDash === 'completo' ? (
            <DashboardGestao pedidos={dadosLojista?.pedidos || []} /> 
          ) : (
            <DashboardBronze 
              pedidos={dadosLojista?.pedidos || []} 
              dadosLojista={dadosLojista} 
            />
          )
        )}

        {telaAtiva === 'produtos' && <CadastroProdutos />}
        {telaAtiva === 'pedidos' && <Pedidos />}
        {telaAtiva === 'config' && <AdminConfig />}
        {telaAtiva === 'gestao-geral' && userRole === 'master' && <GestaoGeral />}
      </main>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  loader: {
    background: '#0f172a', 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: '#fff',
    fontFamily: 'sans-serif'
  },
  blockOverlay: {
    background: '#0f172a',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999
  },
  blockCard: {
    background: '#fff',
    padding: '50px 40px',
    borderRadius: '32px',
    textAlign: 'center',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
  },
  btnSair: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '14px 30px',
    borderRadius: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '15px'
  }
};

export default dynamic(() => Promise.resolve(AdminContent), { ssr: false });