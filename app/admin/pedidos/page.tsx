"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

// --- INTERFACES ---
interface ItemPedido {
  nome: string;
  qty: number;
  preco: number; 
  variacao?: string;
}

interface Pedido {
  id: string;
  cliente: string;
  whatsapp?: string;
  numeroPedido?: number;
  status: string;
  pago: boolean;
  data: string;
  itens: ItemPedido[];
  endereco?: { rua: string; numero: string; bairro: string; cidade: string; uf: string; };
  financeiro?: { total: number; frete?: number; };
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // --- 🟢 LIGAÇÃO FIREBASE (RAIZ CONFORME PRINT) ---
  useEffect(() => {
    // Referência para a coleção 'registros_pedidos' na raiz
    const collectionRef = collection(db, "registros_pedidos");
    
    // Ordenando pelo campo 'data' que existe no seu print
    const q = query(collectionRef, orderBy("data", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Garantir que status e pago tenham valores iniciais se faltarem no DB
          status: data.status || "Pendente",
          pago: data.pago || false,
          itens: data.itens || []
        } as Pedido;
      });
      setPedidos(lista);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- 🟢 FUNÇÕES DE AÇÃO ---
  const alternarStatus = async (id: string, statusAtual: string) => {
    const proximos: { [key: string]: string } = {
      "Pendente": "Em Produção",
      "Em Produção": "Concluído",
      "Concluído": "Pendente"
    };
    const novoStatus = proximos[statusAtual] || "Pendente";
    await updateDoc(doc(db, "registros_pedidos", id), { status: novoStatus });
  };

  const alternarPago = async (id: string, pagoAtual: boolean) => {
    await updateDoc(doc(db, "registros_pedidos", id), { pago: !pagoAtual });
  };

  const exportarExcel = () => {
    const alvo = selecionados.length > 0 ? pedidos.filter(p => selecionados.includes(p.id)) : pedidosFiltrados;
    const cabecalho = ["Pedido", "Cliente", "Itens", "Status", "Pago", "Total"];
    const linhas = alvo.map(p => [
      p.id.substring(0,5),
      p.cliente,
      p.itens.map(i => `${i.qty}x ${i.nome}${i.variacao ? ' ('+i.variacao+')' : ''}`).join(" | "),
      p.status,
      p.pago ? "Sim" : "Não",
      p.financeiro?.total || 0
    ]);
    const csv = [cabecalho, ...linhas].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pedidos.csv";
    link.click();
  };

  const pedidosFiltrados = pedidos.filter(p => {
    const matchBusca = p.cliente?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "Todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div style={styles.contentArea}>
      <div style={styles.header}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
           <h2 style={{fontSize: '20px', color: '#1e293b', margin: 0}}>📋 Gestão de Pedidos</h2>
           <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={exportarExcel} style={{...styles.btnMassPrint, backgroundColor: "#27ae60"}}>📊 Exportar Excel</button>
           </div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.statusTabs}>
          {["Todos", "Pendente", "Em Produção", "Concluído"].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} style={{ ...styles.tabBtn, backgroundColor: filtroStatus === s ? "#2c3e50" : "transparent", color: filtroStatus === s ? "#fff" : "#64748b" }}>{s}</button>
          ))}
        </div>
        <input type="text" placeholder="🔍 Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Nº</th>
              <th style={styles.th}>Cliente / Endereço</th>
              <th style={styles.th}>O que comprou (Itens & Variações)</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id} style={styles.tr}>
                <td style={styles.tdBold}>#{pedido.id.substring(0, 4)}</td>
                <td style={styles.td}>
                  <strong>{pedido.cliente}</strong>
                  <div style={styles.enderecoText}>{pedido.endereco?.cidade}/{pedido.endereco?.uf}</div>
                </td>
                <td style={styles.td}>
                  {pedido.itens.map((item, idx) => (
                    <div key={idx} style={styles.itemLine}>
                      <span style={{fontWeight: '600'}}>{item.qty}x</span> {item.nome}
                      {item.variacao && <span style={styles.tagVariacao}> ({item.variacao})</span>}
                    </div>
                  ))}
                </td>
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* BOTÃO PAGO */}
                    <button 
                      onClick={() => alternarPago(pedido.id, pedido.pago)}
                      style={{ ...styles.actionBtn, backgroundColor: pedido.pago ? "#2ecc71" : "#e74c3c" }}
                    >
                      {pedido.pago ? "PAGO" : "PENDENTE"}
                    </button>
                    
                    {/* BOTÃO ALTERNAR STATUS */}
                    <button 
                      onClick={() => alternarStatus(pedido.id, pedido.status)}
                      style={{ ...styles.actionBtn, backgroundColor: "#34495e" }}
                    >
                      {pedido.status}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  contentArea: { padding: "10px", width: "100%" },
  header: { marginBottom: "20px" },
  btnMassPrint: { padding: "8px 16px", color: "#fff", border: "none", borderRadius: "8px", cursor: 'pointer', fontWeight: 'bold' },
  filterBar: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  statusTabs: { display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px" },
  tabBtn: { border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  searchInput: { padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "250px" },
  tableContainer: { background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#f8fafc", textAlign: "left" },
  th: { padding: "12px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px", fontSize: "13px" },
  tdBold: { padding: "12px", fontWeight: "bold" },
  enderecoText: { fontSize: "11px", color: "#94a3b8" },
  itemLine: { fontSize: "12px", marginBottom: "4px" },
  tagVariacao: { color: "#e67e22", fontWeight: "bold", fontSize: "11px" },
  actionBtn: { border: "none", color: "#fff", padding: "6px 10px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "10px", minWidth: "90px" }
};