"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      setIsReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (pathname !== "/login") router.replace("/login");
        return;
      }

      try {
        // Tenta buscar como Admin
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setIsReady(true);
        } else {
          // Tenta buscar como Lojista
          const lojistaRef = doc(db, "lojistas", user.uid);
          const lojistaSnap = await getDoc(lojistaRef);
          
          if (lojistaSnap.exists()) {
            const data = lojistaSnap.data();
            const tsVencimento = data.dadosLoja?.tsVencimentoLoja?.toDate();
            const hoje = new Date();

            // Lógica de Suspensão Automática por Vencimento
            if (tsVencimento && hoje > tsVencimento && data.dsStatusLoja === 'ativo') {
              await updateDoc(lojistaRef, { dsStatusLoja: 'suspenso' });
              router.replace("/atendimento-suporte");
              return;
            }

            // Bloqueio de Acesso se estiver suspenso
            if (data.dsStatusLoja === 'suspenso') {
              if (pathname !== "/atendimento-suporte") {
                router.replace("/atendimento-suporte");
              } else {
                setIsReady(true);
              }
              return;
            }

            setIsReady(true);
          } else {
            router.replace("/login");
          }
        }
      } catch (e) {
        console.error("Erro na verificação de acesso:", e);
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (!isReady) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loader}></div>
        <strong style={{ fontFamily: 'sans-serif', marginTop: '10px' }}>Carregando sistema...</strong>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: { height: '100vh', width: '100vw', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 99999, position: 'fixed', top: 0, left: 0 },
  loader: { width: '40px', height: '40px', border: '4px solid #334155', borderTop: '4px solid #fdb813', borderRadius: '50%', animation: 'spin 1s linear infinite' }
};