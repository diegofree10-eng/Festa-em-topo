"use client";
import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardGestao() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const caminho = `lojistas/${user.uid}/pedidos`;
        const q = query(collection(db, caminho), orderBy("dataCadastro", "desc"));
        const unsubSnap = onSnapshot(q, (snap) => {
          setPedidos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }, () => setLoading(false));
        return () => unsubSnap();
      }
    });
    return () => unsubAuth();
  }, []);

  const stats = useMemo(() => {
    const total = pedidos.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);
    const custo = pedidos.reduce((acc, p) => acc + (Number(p.custoProducao) || 0), 0);
    return { lucro: total - custo, faturamento: total };
  }, [pedidos]);

  if (loading) return <div style={{padding: '20px'}}>Carregando Balanço...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <h1>📈 Balanço de Lucratividade</h1>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={cardStyle}>
          <small>LUCRO REAL</small>
          <h2 style={{color: '#10b981'}}>R$ {stats.lucro.toLocaleString('pt-BR')}</h2>
        </div>
        <div style={cardStyle}>
          <small>FATURAMENTO</small>
          <h2>R$ {stats.faturamento.toLocaleString('pt-BR')}</h2>
        </div>
      </div>
    </div>
  );
}

const cardStyle = { background: '#fff', padding: '25px', borderRadius: '15px', flex: 1, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };