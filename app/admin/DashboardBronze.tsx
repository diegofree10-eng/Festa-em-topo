"use client";
import React from "react";
import { 
  FiPackage, FiClock, FiCheckCircle, FiAlertCircle, 
  FiDollarSign, FiShoppingBag, FiArrowRight 
} from "react-icons/fi";

interface DashboardBronzeProps {
  pedidos: any[];
  dadosLojista: any;
}

export default function DashboardBronze({ pedidos, dadosLojista }: DashboardBronzeProps) {
  // Filtros rápidos para o lojista Bronze
  const pendentes = pedidos.filter(p => p.status === "pendente" || p.status === "preparando");
  const concluidosHoje = pedidos.filter(p => p.status === "entregue" && 
    new Date(p.updatedAt).toDateString() === new Date().toDateString()
  );

  return (
    <div style={styles.container}>
      {/* Header Simples */}
      <header style={styles.header}>
        <h2 style={styles.saudacao}>Olá, {dadosLojista.nomeLoja}! 👋</h2>
        <p style={styles.sub}>Resumo do seu dia (Plano Bronze)</p>
      </header>

      {/* Cards de Operação - Estilo Mobile App */}
      <div style={styles.gridOperacional}>
        <div style={{...styles.cardOp, borderLeft: '4px solid #f59e0b'}}>
          <FiClock size={20} color="#f59e0b" />
          <div>
            <span style={styles.cardTitulo}>Para Produzir</span>
            <h3 style={styles.cardValor}>{pendentes.length}</h3>
          </div>
        </div>

        <div style={{...styles.cardOp, borderLeft: '4px solid #10b981'}}>
          <FiCheckCircle size={20} color="#10b981" />
          <div>
            <span style={styles.cardTitulo}>Entregues Hoje</span>
            <h3 style={styles.cardValor}>{concluidosHoje.length}</h3>
          </div>
        </div>
      </div>

      {/* Seção de Pedidos Recentes */}
      <section style={styles.secao}>
        <div style={styles.secaoHead}>
          <h3 style={styles.secaoTitle}>Últimos Pedidos</h3>
          <button style={styles.btnVerTodos}>Ver Todos <FiArrowRight /></button>
        </div>

        <div style={styles.lista}>
          {pedidos.slice(0, 8).map((pedido) => (
            <div key={pedido.id} style={styles.itemPedido}>
              <div style={styles.infoPedido}>
                <div style={styles.avatarPedido}>#{pedido.id.slice(-4)}</div>
                <div>
                  <p style={styles.clienteNome}>{pedido.clienteNome}</p>
                  <p style={styles.detalhePedido}>{pedido.itens?.length || 0} itens • R$ {pedido.total?.toFixed(2)}</p>
                </div>
              </div>
              <span style={{
                ...styles.badge, 
                backgroundColor: pedido.status === 'pendente' ? '#fef3c7' : '#ecfdf5',
                color: pedido.status === 'pendente' ? '#92400e' : '#065f46'
              }}>
                {pedido.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Banner de Upgrade para Métricas Avançadas */}
      <div style={styles.bannerUpgrade}>
        <div style={styles.iconUpgrade}><FiDollarSign size={20} /></div>
        <div style={{flex: 1}}>
          <h4 style={styles.upgradeTitle}>Quer ver seu faturamento?</h4>
          <p style={styles.upgradeText}>Assine o plano <b>Prata</b> para liberar gráficos de vendas e relatórios mensais.</p>
        </div>
        <button style={styles.btnUpgrade}>Upgrade</button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "20px", background: "#f8fafc", minHeight: "100vh" },
  header: { marginBottom: "25px" },
  saudacao: { fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: 0 },
  sub: { fontSize: "14px", color: "#64748b", marginTop: "4px" },
  gridOperacional: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" },
  cardOp: { background: "#fff", padding: "18px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  cardTitulo: { fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" },
  cardValor: { fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: 0 },
  secao: { background: "#fff", borderRadius: "20px", padding: "20px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" },
  secaoHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  secaoTitle: { fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 },
  btnVerTodos: { border: "none", background: "none", color: "#3b82f6", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" },
  lista: { display: "flex", flexDirection: "column", gap: "15px" },
  itemPedido: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "15px", borderBottom: "1px solid #f1f5f9" },
  infoPedido: { display: "flex", alignItems: "center", gap: "12px" },
  avatarPedido: { width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "#64748b" },
  clienteNome: { fontSize: "14px", fontWeight: "700", color: "#334155", margin: 0 },
  detalhePedido: { fontSize: "12px", color: "#94a3b8", margin: 0 },
  badge: { padding: "4px 10px", borderRadius: "8px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase" },
  bannerUpgrade: { marginTop: "25px", background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", padding: "20px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "15px", color: "#fff" },
  iconUpgrade: { width: "40px", height: "40px", background: "rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  upgradeTitle: { fontSize: "15px", fontWeight: "700", margin: 0 },
  upgradeText: { fontSize: "12px", color: "#cbd5e1", margin: "2px 0 0" },
  btnUpgrade: { background: "#fbbf24", color: "#78350f", border: "none", padding: "8px 15px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }
};