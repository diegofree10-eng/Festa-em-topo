"use client";
import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import Sidebar from "./Sidebar"; 
import DashboardGestao from "./DashboardGestao"; 
import Produtos from "./produtos/page"; 
import Pedidos from "./pedidos/page"; 
import AdminConfig from "./config/page"; 
import GestaoGeral from "./components/GestaoGeral"; 

function AdminContent() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        // Busca na coleção 'usuarios' conforme seu Firestore (Imagem 13.png)
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserRole(userSnap.data().role);
        }
      } catch (error) {
        console.error("Erro ao validar acesso:", error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <div style={{background: '#0f172a', height: '100vh'}} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {telaAtiva === 'dash' && <DashboardGestao />}
        {telaAtiva === 'produtos' && <Produtos />}
        {telaAtiva === 'pedidos' && <Pedidos />}
        {telaAtiva === 'config' && <AdminConfig />}
        {telaAtiva === 'gestao-geral' && userRole === 'master' && <GestaoGeral />}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminContent), { ssr: false });