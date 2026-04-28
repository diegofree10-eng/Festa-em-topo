"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar"; 
import DashboardGestao from "./DashboardGestao"; 
import Produtos from "./produtos/page"; 
import MobileLayout from "./produtos/MobileLayout";
import AdminConfig from "./config/page"; 
import { auth, db } from "@/lib/firebase"; // NOVO: Importa auth e db
import { doc, getDoc } from "firebase/firestore"; // NOVO: Para buscar a role

export default function AdminPage() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [isMobile, setIsMobile] = useState(null);
  const [userRole, setUserRole] = useState(null); // NOVO: Estado para guardar a role (master/lojista)

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024);
    checkDevice();
    window.addEventListener("resize", checkDevice);

    // NOVO: Busca a ROLE do usuário logado no Firebase
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "lojistas", user.uid); // Ajuste "lojistas" para o nome da sua coleção
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
        }
      }
    };
    fetchUserRole();

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (isMobile === null) return null;

  if (isMobile) {
    return <MobileLayout telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {/* AJUSTE: Agora passamos o userRole para a Sidebar */}
      <Sidebar 
        telaAtiva={telaAtiva} 
        setTelaAtiva={setTelaAtiva} 
        userRole={userRole} 
      />
      
      <main style={{ flex: 1, overflowY: "auto" }}>
        {telaAtiva === 'dash' && <DashboardGestao />}
        {telaAtiva === 'produtos' && <Produtos />}

        {telaAtiva === 'pedidos' && (
          <div style={{ padding: '40px' }}>
            <h2>📦 Gestão de Pedidos e Produção</h2>
            <p>Em breve: controle de status e pagamentos.</p>
          </div>
        )}

        {telaAtiva === 'config' && <AdminConfig />} 
        
        {/* NOVO: Espaço para a tela de Gestão Geral (Dono) */}
        {telaAtiva === 'gestao-geral' && (
          <div style={{ padding: '40px' }}>
            <h2>⚙️ Painel do Proprietário (Master)</h2>
            <p>Aqui você verá todos os lojistas cadastrados.</p>
          </div>
        )}
      </main>
    </div>
  );
}