"use client";
import React, { useState, useLayoutEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useLayoutEffect(() => {
    // Libera a página de login imediatamente
    if (pathname === "/login") {
      setAuthorized(true);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          throw new Error("Sem sessão ativa.");
        }

        // Busca o perfil na coleção 'usuarios'
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
          // Fallback para lojistas
          const lojistaRef = doc(db, "lojistas", user.uid);
          const lojistaSnap = await getDoc(lojistaRef);
          
          if (lojistaSnap.exists()) {
            setAuthorized(true);
          } else {
            throw new Error("Acesso não autorizado.");
          }
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);
        setAuthorized(false);
        // Limpa o cookie se a autenticação falhar
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

  // Enquanto estiver carregando, mostra o overlay
  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loader}></div>
        <strong style={{ fontFamily: 'sans-serif' }}>Verificando credenciais...</strong>
      </div>
    );
  }

  // Se não estiver autorizado e não for login, não renderiza nada
  if (!authorized && pathname !== "/login") return null;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#f8fafc" }}>
      {children}
    </div>
  );
}

const styles = {
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
  }
};