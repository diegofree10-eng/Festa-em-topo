"use client";
import { useEffect, useState, useLayoutEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Usamos useLayoutEffect para a primeira checagem ser antes da pintura da tela
  useLayoutEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthorized(true);
        setLoading(false);
      } else {
        setAuthorized(false);
        setLoading(false);
        
        // Se não há usuário, manda para o login imediatamente
        if (pathname.startsWith('/admin')) {
          router.replace("/login");
        }
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // 1. Enquanto checa, bloqueia TUDO com uma tela de segurança
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', width: '100vw', background: '#0f172a', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        color: '#fff', zIndex: 99999, position: 'fixed', top: 0, left: 0 
      }}>
        <strong>Protegendo acesso...</strong>
      </div>
    );
  }

  // 2. Trava absoluta: Se o Firebase disse que não tem user, o HTML do Admin MORRE aqui.
  // Mesmo que o cara aperte o botão "voltar", ele verá apenas uma tela nula.
  if (!authorized) {
    return null; 
  }

  // 3. Acesso liberado
  return <div style={{ width: "100%", minHeight: "100vh" }}>{children}</div>;
}