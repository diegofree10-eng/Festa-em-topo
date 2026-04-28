"use client";
import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; // Necessário para bloquear o SSR
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

// 1. Mudamos o nome da função para AdminContent
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
        const docSnap = await getDoc(doc(db, "lojistas", user.uid));
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
          setPodeVer(true); // Só libera a tela aqui
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

  // Se não estiver confirmado, a tela fica TOTALMENTE vazia (Preta/Branca)
  // Isso impede que qualquer menu ou botão apareça via URL
  if (!podeVer || isMobile === null) {
    return <div style={{ height: '100vh', background: '#0f172a' }} />;
  }

  if (isMobile) {
    return <MobileLayout telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} userRole={userRole} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {telaAtiva === 'dash' && <DashboardGestao />}
        {telaAtiva === 'produtos' && <Produtos />}
        {telaAtiva === 'config' && <AdminConfig />}
        {telaAtiva === 'gestao-geral' && (
          <div style={{ padding: '40px' }}><h2>Painel Master</h2></div>
        )}
      </main>
    </div>
  );
}

// 2. O PULO DO GATO: Exportamos com SSR desativado
// Isso impede o Next.js de carregar a página "por trás" sem permissão
export default dynamic(() => Promise.resolve(AdminContent), { 
  ssr: false,
  loading: () => <div style={{ height: '100vh', background: '#0f172a' }} />
});