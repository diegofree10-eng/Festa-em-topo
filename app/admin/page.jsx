"use client";
import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Importações dos seus componentes
import Sidebar from "./Sidebar"; 
import DashboardGestao from "./DashboardGestao"; 
import Produtos from "./produtos/page"; 
import MobileLayout from "./produtos/MobileLayout";
import AdminConfig from "./config/page"; 

// --- NOVO COMPONENTE ---
// Recomendo criar este componente em um arquivo separado depois, 
// mas por enquanto vamos integrá-lo aqui.
import GestaoGeral from "./components/GestaoGeral"; 

function AdminContent() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [isMobile, setIsMobile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [podeVer, setPodeVer] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024);
    checkDevice();
    window.addEventListener("resize", checkDevice);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        const docRef = doc(db, "lojistas", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const role = docSnap.data().role;
          setUserRole(role);
          setPodeVer(true);
        } else {
          router.replace("/login");
        }
      }
    });

    return () => {
      window.removeEventListener("resize", checkDevice);
      unsubscribe();
    };
  }, [router]);

  // Bloqueio de segurança visual
  if (!podeVer || isMobile === null) {
    return <div style={{ height: '100vh', background: '#0f172a' }} />;
  }

  // Layout Mobile (Lojista)
  if (isMobile) {
    return <MobileLayout telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* O Sidebar já recebe o userRole para mostrar ou esconder o botão Master */}
      <Sidebar 
        telaAtiva={telaAtiva} 
        setTelaAtiva={setTelaAtiva} 
        userRole={userRole} 
      />

      <main style={{ flex: 1, overflowY: "auto" }}>
        {/* Telas do Lojista Comum */}
        {telaAtiva === 'dash' && <DashboardGestao />}
        {telaAtiva === 'produtos' && <Produtos />}
        {telaAtiva === 'config' && <AdminConfig />}

        {/* --- TELA GESTÃO GERAL (MASTER ONLY) --- */}
        {telaAtiva === 'gestao-geral' && userRole === 'master' && (
          <GestaoGeral />
        )}
        
        {/* Caso um espertinho tente mudar o estado via console sem ser master */}
        {telaAtiva === 'gestao-geral' && userRole !== 'master' && (
          <div style={{ padding: '40px' }}>Acesso Negado</div>
        )}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminContent), { 
  ssr: false,
  loading: () => <div style={{ height: '100vh', background: '#0f172a' }} />
});