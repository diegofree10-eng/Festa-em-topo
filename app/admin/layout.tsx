"use client";
import { useState, useLayoutEffect } from "react";
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const docRef = doc(db, "lojistas", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            document.cookie = `session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            setAuthorized(true);
          } else {
            throw new Error("Acesso não autorizado.");
          }
        } else {
          throw new Error("Sem sessão.");
        }
      } catch (error) {
        setAuthorized(false);
        document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        if (pathname.startsWith('/admin')) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loader}></div>
        <strong>Protegendo acesso ao Festa em Topo...</strong>
      </div>
    );
  }

  if (!authorized) {
    return null; 
  }

  return <div style={{ width: "100%", minHeight: "100vh" }}>{children}</div>;
}

const styles = {
  overlay: {
    height: '100vh', 
    width: '100vw', 
    background: '#0f172a', 
    display: 'flex', 
    flexDirection: 'column' as 'column',
    gap: '20px',
    alignItems: 'center', 
    justifyContent: 'center', 
    color: '#fff', 
    zIndex: 99999, 
    position: 'fixed' as 'fixed', 
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