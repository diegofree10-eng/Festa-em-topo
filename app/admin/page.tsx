"use client";

import React, { useState, useEffect, useRef, CSSProperties } from "react";
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

import Sidebar from "./Sidebar";
import { DashboardGestao } from "./DashboardGestao";
import { DashboardBronze } from "./DashboardBronze";
import CadastroProdutos from "./produtos/page";
import Pedidos from "./pedidos/page";
import AdminConfig from "./config/page";
import GestaoGeral from "./components/GestaoGeral";

function AdminContent() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dadosLojista, setDadosLojista] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [lojistaIdReal, setLojistaIdReal] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const unsubLojaRef = useRef<(() => void) | null>(null);
  const unsubPedidosRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isLoggingOut) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (pathname !== "/login") window.location.replace("/login");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserRole(userData.role);
          setLojistaIdReal(userData.lojaId);

          if (userData.lojaId) {
            console.log("ID da loja encontrado:", userData.lojaId); // SE ISSO FOR UNDEFINED, O ERRO É AQUI

            if (unsubLojaRef.current) unsubLojaRef.current();
            if (unsubPedidosRef.current) unsubPedidosRef.current();

            // Listener da Loja
            unsubLojaRef.current = onSnapshot(doc(db, "lojistas", userData.lojaId), (snapLoja) => {
              if (snapLoja.exists()) {
                setDadosLojista(snapLoja.data());
              }
            }, (err) => console.error("Erro Loja:", err.code));

            // Listener de Pedidos
            const qPedidos = query(collection(db, "lojistas", userData.lojaId, "pedidos"), orderBy("numeroPedido", "desc"));
            unsubPedidosRef.current = onSnapshot(qPedidos, (snapPedidos) => {
              setPedidos(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));
              setLoading(false); // Carregamento finalizado ao receber pedidos
            }, (err) => {
              console.error("Erro Pedidos:", err.code);
              setLoading(false); // Também finaliza em caso de erro para não travar a tela
            });
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Erro na carga de dados:", e);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, isLoggingOut]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (unsubLojaRef.current) unsubLojaRef.current();
    if (unsubPedidosRef.current) unsubPedidosRef.current();

    try {
      await signOut(auth);
      window.location.replace("/login");
    } catch (error) {
      window.location.replace("/login");
    }
  };

  if (isLoggingOut || loading) return <div style={styles.loader}>Carregando sistema...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} onLogout={handleLogout} />
      <main style={{ flex: 1, overflowY: "auto", height: "100vh", padding: "20px" }}>

        {/* DASHBOARD */}
        {telaAtiva === 'dash' && dadosLojista && (
          (dadosLojista.plano === 'Ouro' || dadosLojista.plano === 'Prata') ? (
            <DashboardGestao pedidos={pedidos} lojistaId={lojistaIdReal || undefined} />
          ) : (
            <DashboardBronze pedidos={pedidos} dadosLojista={dadosLojista || undefined} />
          )
        )}

        {/* OUTRAS TELAS */}
        {telaAtiva === 'produtos' && <CadastroProdutos />}
        {telaAtiva === 'pedidos' && lojistaIdReal && <Pedidos pedidos={pedidos} db={db} lojistaIdApp={lojistaIdReal} />}
        {telaAtiva === 'config' && <AdminConfig />}
        {telaAtiva === 'gestao-geral' && userRole === 'master' && <GestaoGeral />}

      </main>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  loader: { background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '16px' }
};

export default dynamic(() => Promise.resolve(AdminContent), { ssr: false });