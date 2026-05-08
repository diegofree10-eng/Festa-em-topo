"use client";
import React, { useState, useLayoutEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [mensagemErro, setMensagemErro] = useState<string>(""); // Novo: para avisar sobre suspensão
  const router = useRouter();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname === "/login") {
      setAuthorized(true);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) throw new Error("Sem sessão ativa.");

        // 1. Primeiro tenta buscar na coleção 'usuarios' (Admin/Master)
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          if (pathname.includes("gestao-geral") && userData.role !== "master") {
            router.replace("/admin/dash");
            return;
          }

          document.cookie = `session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          setAuthorized(true);
        } else {
          // 2. Fallback para 'lojistas' - Aqui checamos a suspensão
          const lojistaRef = doc(db, "lojistas", user.uid);
          const lojistaSnap = await getDoc(lojistaRef);
          
          if (lojistaSnap.exists()) {
            const lojistaData = lojistaSnap.data();

            // --- TRAVA DE SEGURANÇA: VERIFICA STATUS ---
            if (lojistaData.status === "suspenso") {
              setMensagemErro("Sua loja está suspensa pelo administrador.");
              setAuthorized(false);
              // Opcional: Deslogar o usuário suspenso
              // await auth.signOut(); 
              return; 
            }

            setAuthorized(true);
          } else {
            throw new Error("Acesso não autorizado.");
          }
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);
        setAuthorized(false);
        document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        if (pathname !== "/login") {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // Tela de carregamento
  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loader}></div>
        <strong style={{ fontFamily: 'sans-serif' }}>Verificando credenciais...</strong>
      </div>
    );
  }

  // TELA DE BLOQUEIO PARA LOJISTA SUSPENSO
  if (mensagemErro) {
    return (
      <div style={styles.overlay}>
        <div style={{...styles.cardErro, textAlign: 'center'}}>
           <h2 style={{color: '#ef4444', marginBottom: '10px'}}>⚠️ Acesso Bloqueado</h2>
           <p style={{color: '#fff', marginBottom: '20px'}}>{mensagemErro}</p>
           <button 
             onClick={() => {
               auth.signOut();
               window.location.href = "/login";
             }}
             style={styles.btnVoltar}
           >
             Sair da conta
           </button>
        </div>
      </div>
    );
  }

  if (!authorized && pathname !== "/login") return null;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#f8fafc" }}>
      {children}
    </div>
  );
}

const styles: any = {
  overlay: {
    height: '100vh', 
    width: '100vw', 
    background: '#0f172a', 
    display: 'flex', 
    flexDirection: 'column' as const,
    gap: '20px',
    alignItems: 'center', 
    justifyContent: 'center', 
    color: '#fff', 
    zIndex: 99999, 
    position: 'fixed' as const, 
    top: 0, 
    left: 0 
  },
  loader: {
    width: '40px',
    height: '40px',
    border: '4px solid #334155',
    borderTop: '4px solid #fdb813',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  cardErro: {
    padding: '40px',
    background: '#1e293b',
    borderRadius: '24px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
    maxWidth: '400px',
    width: '90%'
  },
  btnVoltar: {
    padding: '12px 24px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};