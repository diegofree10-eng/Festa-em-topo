"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar"; 
import DashboardGestao from "./DashboardGestao"; 
import Produtos from "./produtos/page"; 
import MobileLayout from "./produtos/MobileLayout";
import AdminConfig from "./config/page"; // 1. IMPORTA O NOVO ARQUIVO

export default function AdminPage() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024);
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (isMobile === null) return null;

  if (isMobile) {
    return <MobileLayout telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />
      
      <main style={{ flex: 1, overflowY: "auto" }}>
        {/* 1. DASHBOARD (Balanço/Lucro) */}
        {telaAtiva === 'dash' && <DashboardGestao />}

        {/* 2. PRODUTOS (Cadastro/Listagem) */}
        {telaAtiva === 'produtos' && <Produtos />}

        {/* 3. PEDIDOS (Gestão de produção) */}
        {telaAtiva === 'pedidos' && (
          <div style={{ padding: '40px' }}>
            <h2>📦 Gestão de Pedidos e Produção</h2>
            <p>Em breve: controle de status e pagamentos.</p>
          </div>
        )}

        {/* 4. CONFIGURAÇÕES (Onde o lojista altera Logo e PIX) */}
        {telaAtiva === 'config' && <AdminConfig />} 
      </main>
    </div>
  );
}