"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FiUsers, FiAlertTriangle, FiShoppingBag, FiDollarSign } from "react-icons/fi";

export default function GestaoGeral() {
  const [stats, setStats] = useState({
    totalLojas: 0,
    totalDenuncias: 0,
    totalProdutos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGlobalStats() {
      try {
        // 1. Total de Lojas
        const lojasSnap = await getDocs(collection(db, "lojistas"));
        
        // 2. Total de Denúncias Pendentes
        const qDenuncias = query(collection(db, "denuncias"), where("status", "==", "pendente"));
        const denunciasSnap = await getDocs(qDenuncias);

        setStats({
          totalLojas: lojasSnap.size,
          totalDenuncias: denunciasSnap.size,
          totalProdutos: 0, // Poderíamos somar percorrendo subcoleções se necessário
        });
      } catch (e) {
        console.error("Erro ao carregar dashboard master:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchGlobalStats();
  }, []);

  if (loading) return <p>Carregando dados da plataforma...</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Painel Master - Festa em Topo</h1>
      
      <div style={styles.grid}>
        <div style={styles.card}>
          <FiUsers size={30} color="#fdb813" />
          <div>
            <h3 style={styles.cardVal}>{stats.totalLojas}</h3>
            <p style={styles.cardLabel}>Lojas Cadastradas</p>
          </div>
        </div>

        <div style={{...styles.card, borderLeft: '5px solid #ef4444'}} onClick={() => window.location.href='/admin/denuncias'}>
          <FiAlertTriangle size={30} color="#ef4444" />
          <div>
            <h3 style={styles.cardVal}>{stats.totalDenuncias}</h3>
            <p style={styles.cardLabel}>Denúncias Pendentes</p>
          </div>
          <span style={styles.link}>Ver todas</span>
        </div>

        <div style={styles.card}>
          <FiShoppingBag size={30} color="#2ecc71" />
          <div>
            <h3 style={styles.cardVal}>SaaS</h3>
            <p style={styles.cardLabel}>Status do Sistema: OK</p>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2>Ações Rápidas</h2>
        <div style={styles.btnGroup}>
           <button style={styles.actionBtn}>Listar Todos os Lojistas</button>
           <button style={styles.actionBtn}>Configurações Globais</button>
           <button style={{...styles.actionBtn, background: '#ef4444', color: '#fff'}}>Suspender Loja</button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '30px' },
  title: { marginBottom: '30px', color: '#1e293b' },
  grid: { display: 'flex', gap: '20px', marginBottom: '40px' },
  card: { flex: 1, background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' },
  cardVal: { fontSize: '28px', margin: 0, color: '#1e293b' },
  cardLabel: { fontSize: '14px', margin: 0, color: '#64748b' },
  link: { fontSize: '10px', textDecoration: 'underline', color: '#64748b', marginLeft: 'auto' },
  section: { background: '#fff', padding: '25px', borderRadius: '12px' },
  btnGroup: { display: 'flex', gap: '10px', marginTop: '15px' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }
};