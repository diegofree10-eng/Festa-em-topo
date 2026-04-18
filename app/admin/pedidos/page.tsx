"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminPedidos() {
  const router = useRouter();
  
  const [isLogged, setIsLogged] = useState(false);
  const [password, setPassword] = useState("");
  
  // CORREÇÃO AQUI: Inicializado como array vazio tipado implicitamente para evitar erro no build da Vercel
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  function handleLogin() {
    const SENHA_MESTRE = "1234"; // Dica: mude isso antes de divulgar o link real!
    if (password === SENHA_MESTRE) {
      setIsLogged(true);
    } else {
      alert("Senha incorreta! ❌");
    }
  }

  useEffect(() => {
    if (!isLogged) return;
    const q = query(collection(db, "registros_pedidos"), orderBy("numeroPedido", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPedidos(lista);
      setLoading(false);
    });
    return () => unsub();
  }, [isLogged]);

  async function confirmarPagamento(id, pagoAtual) {
    try {
      const pedidoRef = doc(db, "registros_pedidos", id);
      await updateDoc(pedidoRef, { pago: !pagoAtual });
    } catch (e) {
      alert("Erro ao atualizar pagamento");
    }
  }

  async function alterarStatus(id, statusAtual) {
    const proximosStatus = {
      "Pendente": "Em Produção",
      "Em Produção": "Concluído",
      "Concluído": "Pendente"
    };
    const novoStatus = proximosStatus[statusAtual] || "Pendente";
    
    try {
      const pedidoRef = doc(db, "registros_pedidos", id);
      await updateDoc(pedidoRef, { status: novoStatus });
    } catch (e) {
      alert("Erro ao atualizar status");
    }
  }

  async function apagarPedido(id) {
    if (confirm("Deseja eliminar este registro permanentemente?")) {
      await deleteDoc(doc(db, "registros_pedidos", id));
    }
  }

  const pedidosFiltrados = pedidos.filter(p => 
    p.cliente?.toLowerCase().includes(busca.toLowerCase()) || 
    p.numeroPedido?.toString().includes(busca)
  );

  if (!isLogged) {
    return (
      <div style={styles.loginOverlay}>
        <div style={styles.loginBox}>
          <h2>🔐 Relatórios Protegidos</h2>
          <p style={{fontSize: '14px', color: '#666', marginBottom: '20px'}}>Digite a senha para visualizar as vendas</p>
          <input 
            type="password" 
            placeholder="Senha" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={styles.inputLogin}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button onClick={handleLogin} style={styles.btnGreen}>Acessar Relatórios</button>
          <button onClick={() => router.push("/admin")} style={styles.btnBackMinimal}>Voltar</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>Carregando relatórios...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => router.push("/admin")} style={styles.btnBack}>
          ⬅ Voltar ao Painel Admin
        </button>
        <h1 style={{marginTop: '15px'}}>📊 Gestão de Pedidos</h1>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pendentes</span>
          <h2 style={{ color: "#e67e22", margin: '5px 0' }}>
            {pedidos.filter(p => p.status === "Pendente").length}
          </h2>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Faturamento</span>
          <h2 style={{ margin: '5px 0' }}>
            R$ {pedidos.reduce((acc, p) => acc + (p.financeiro?.total || 0), 0).toFixed(2).replace(".", ",")}
          </h2>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>💰 Recebido</span>
          <h2 style={{ color: "#2ecc71", margin: '5px 0' }}>
            R$ {pedidos.filter(p => p.pago).reduce((acc, p) => acc + (p.financeiro?.total || 0), 0).toFixed(2).replace(".", ",")}
          </h2>
        </div>
      </div>

      <div style={styles.searchBar}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por cliente ou nº do pedido..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Nº</th>
              <th style={styles.th}>Data</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Produtos</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id} style={{ 
                ...styles.tr, 
                backgroundColor: pedido.status === "Concluído" ? "#f0fff4" : "#fff" 
              }}>
                <td style={styles.tdBold}>#{pedido.numeroPedido}</td>
                <td style={styles.td}>{pedido.data}</td>
                <td style={styles.td}>{pedido.cliente}</td>
                <td style={styles.td}>
                  {pedido.itens?.map((item, idx) => (
                    <div key={idx} style={styles.itemContainer}>
                      <div style={styles.itemLine}><strong>{item.qty}x</strong> {item.nome}</div>
                      {item.variacao && (
                        <div style={{
                          ...styles.badgeVariacao,
                          backgroundColor: 
                            item.variacao === "Basico" ? "#e2e8f0" : 
                            item.variacao === "Completo" ? "#dbeafe" : "#fef3c7"
                        }}>
                          ✨ {item.variacao}
                        </div>
                      )}
                    </div>
                  ))}

                  {pedido.personalizacao && pedido.personalizacao !== "N/A" && (
                    <div style={styles.personalizacaoBox}>
                      <div style={styles.personalizacaoTitle}>🎁 PERSONALIZAÇÃO:</div>
                      <div style={styles.personalizacaoText}>
                        <strong>Nome:</strong> {pedido.personalizacao.nome} <br/>
                        <strong>Idade:</strong> {pedido.personalizacao.idade} anos
                      </div>
                    </div>
                  )}
                </td>
                <td style={styles.tdTotal}>
                  R$ {pedido.financeiro?.total.toFixed(2).replace(".", ",")}
                </td>
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button 
                      onClick={() => confirmarPagamento(pedido.id, pedido.pago)}
                      style={{
                        ...styles.statusBtn,
                        backgroundColor: pedido.pago ? "#2ecc71" : "#bdc3c7",
                      }}
                    >
                      {pedido.pago ? "💰 Pago" : "💵 Confirmar"}
                    </button>

                    <button 
                      onClick={() => alterarStatus(pedido.id, pedido.status)}
                      style={{
                        ...styles.statusBtn,
                        backgroundColor: 
                          pedido.status === "Concluído" ? "#3498db" : 
                          pedido.status === "Em Produção" ? "#9b59b6" : "#e67e22",
                      }}
                    >
                      {pedido.status === "Concluído" ? "✓ OK" : 
                       pedido.status === "Em Produção" ? "🛠️ Prod" : "⏳ Pend"}
                    </button>

                    <button onClick={() => apagarPedido(pedido.id)} style={styles.deleteBtn}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidosFiltrados.length === 0 && (
          <div style={{padding: '30px', textAlign: 'center', color: '#64748b'}}>Nenhum pedido encontrado.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  loginOverlay: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f0f2f5" },
  loginBox: { background: "#fff", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", width: "90%", maxWidth: "320px" },
  inputLogin: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" },
  btnBack: { padding: "10px 15px", background: "#3498db", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  btnBackMinimal: { marginTop: "15px", background: "none", border: "none", color: "#666", cursor: "pointer", textDecoration: "underline", display: 'block', width: '100%' },
  btnGreen: { background: "#2ecc71", color: "#fff", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", width: "100%", fontWeight: "bold" },
  page: { padding: "15px", background: "#f8f9fa", minHeight: "100vh", fontFamily: "sans-serif" },
  header: { marginBottom: "20px" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#64748b" },
  statsRow: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" },
  statCard: { background: "#fff", padding: "15px", borderRadius: "12px", flex: "1 1 150px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  statLabel: { fontSize: "12px", color: "#64748b", fontWeight: "bold" },
  searchBar: { marginBottom: "20px" },
  searchInput: { width: "100%", maxWidth: "400px", padding: "12px 20px", borderRadius: "25px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", boxSizing: "border-box" },
  tableContainer: { background: "#fff", borderRadius: "12px", overflowX: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", WebkitOverflowScrolling: "touch" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }, // Força scroll lateral se a tela for menor que 800px
  thead: { background: "#2c3e50", color: "#fff" },
  th: { padding: "15px", fontSize: "12px", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "15px", fontSize: "14px", color: "#444" },
  tdBold: { padding: "15px", fontWeight: "bold", color: "#2c3e50" },
  tdTotal: { padding: "15px", fontWeight: "bold", color: "#2ecc71" },
  itemContainer: { marginBottom: "8px" },
  itemLine: { fontSize: "13px" },
  badgeVariacao: { display: "inline-block", fontSize: "10px", fontWeight: "bold", padding: "2px 8px", borderRadius: "10px", marginTop: "4px" },
  personalizacaoBox: { marginTop: "10px", padding: "8px", background: "#fff9db", borderRadius: "8px", border: "1px dashed #f1c40f" },
  personalizacaoTitle: { fontSize: "10px", fontWeight: "bold", color: "#856404" },
  personalizacaoText: { fontSize: "12px", color: "#444" },
  statusBtn: { border: "none", color: "#fff", padding: "8px 10px", borderRadius: "15px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", width: "85px" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "16px", opacity: 0.5 }
};