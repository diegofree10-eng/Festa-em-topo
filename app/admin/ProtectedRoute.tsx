"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          // Se não houver usuário, vai para o login
          router.replace("/login");
        } else {
          // Opcional: Verificar se o lojista existe no banco ou está ativo
          const docRef = doc(db, "lojistas", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            await auth.signOut();
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("Erro na proteção de rota:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', width: '100vw', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', 
        background: '#1e293b', color: '#fff', fontSize: '18px' 
      }}>
        Verificando permissões...
      </div>
    );
  }

  return <>{children}</>;
}