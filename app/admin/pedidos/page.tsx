"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";

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
  numeroPedido?: number;
  status: string;
  pago: boolean;
  data: string;
  itens: ItemPedido[];
  endereco?: { rua: string; numero: string; bairro: string; cidade: string; uf: string; cep: string; };
  financeiro?: { total: number; frete?: number; metodo: string; };
  personalizacao?: { nome: string; idade: string; };
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [selecionados, setSelecionados] = useState<string[]>([]); // Estado para os checkboxes

  useEffect(() => {
    const collectionRef = collection(db, "registros_pedidos");
    const q = query(collectionRef, orderBy("data", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente": return "#f39c12";
      case "Em Produção": return "#3498db";
      case "Concluído": return "#27ae60";
      default: return "#34495e";
    }
  };

  const alternarSelecao = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const selecionarTodos = () => {
    if (selecionados.length === pedidosFiltrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(pedidosFiltrados.map(p => p.id));
    }
  };

  // --- IMPRESSÃO REFINADA (APENAS SELECIONADOS OU FILTRADOS) ---
  const imprimirLista = () => {
    // Se houver selecionados, filtramos apenas eles, senão pegamos os filtrados da tela
    const pedidosParaImprimir = selecionados.length > 0 
      ? pedidos.filter(p => selecionados.includes(p.id)) 
      : pedidosFiltrados;

    const janelaImpressao = window.open("", "", "width=900,height=700");
    
    if (janelaImpressao) {
      const htmlLinhas = pedidosParaImprimir.map(p => `
        <tr>
          <td>#${p.numeroPedido || p.id.substring(0,4)}</td>
          <td>
            <strong>${p.cliente}</strong><br>
            ${p.endereco?.cidade || ''}/${p.endereco?.uf || ''}<br>
            <small>🚚 ${p.financeiro?.metodo || 'N/A'}</small>
          </td>
          <td>
            ${p.itens.map(i => `<div>${i.qty}x ${i.nome} ${i.variacao ? `(${i.variacao})` : ''}</div>`).join('')}
            ${p.personalizacao ? `<div style="margin-top:5px; color:#b45309; font-size:10px;"><b>Perso:</b> ${p.personalizacao.nome} | ${p.personalizacao.idade} anos</div>` : ''}
          </td>
          <td>${p.status}</td>
        </tr>
      `).join('');

      janelaImpressao.document.write(`
        <html>
          <head>
            <title>Impressão de Pedidos</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
              th { background: #f2f2f2; }
              h2 { text-align: center; margin-bottom: 5px; }
              p { text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h2>Relatório de Pedidos</h2>
            <p>Total de pedidos nesta lista: ${pedidosParaImprimir.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente/Logística</th>
                  <th>Itens/Personalização</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${htmlLinhas}
              </tbody>
            </table>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      janelaImpressao.document.close();
    }
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
              <button onClick={imprimirLista} style={{...styles.btnMassPrint, backgroundColor: "#34495e"}}>
                🖨️ Imprimir {selecionados.length > 0 ? `(${selecionados.length}) Selecionados` : 'Lista'}
              </button>
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
              <th style={{...styles.th, width: '40px'}}>
                <input type="checkbox" onChange={selecionarTodos} checked={pedidosFiltrados.length > 0 && selecionados.length === pedidosFiltrados.length} />
              </th>
              <th style={styles.th}>Nº Pedido</th>
              <th style={styles.th}>Cliente / Logística</th>
              <th style={styles.th}>O que comprou / Personalização</th>
              <th style={{...styles.th, textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id} style={styles.tr}>
                <td style={styles.td}>
                  <input type="checkbox" checked={selecionados.includes(pedido.id)} onChange={() => alternarSelecao(pedido.id)} />
                </td>
                <td style={styles.tdBold}>#{pedido.numeroPedido || pedido.id.substring(0, 4)}</td>
                
                <td style={styles.td}>
                  <strong>{pedido.cliente}</strong>
                  <div style={styles.enderecoText}>{pedido.endereco?.cidade}/{pedido.endereco?.uf}</div>
                  <div style={{fontSize: '11px', color: '#2980b9', fontWeight: 'bold', marginTop: '4px'}}>
                    🚚 {pedido.financeiro?.metodo || "Envio não definido"}
                  </div>
                </td>

                <td style={styles.td}>
                  {pedido.itens.map((item, idx) => (
                    <div key={idx} style={styles.itemLine}>
                      <span style={{fontWeight: '600'}}>{item.qty}x</span> {item.nome}
                      {item.variacao && <span style={styles.tagVariacao}> ({item.variacao})</span>}
                    </div>
                  ))}
                  
                  {pedido.personalizacao && (
                    <div style={{marginTop: '8px', padding: '6px', background: '#fffbeb', borderRadius: '4px', border: '1px solid #fef3c7'}}>
                      <div style={{fontSize: '11px', color: '#92400e', fontWeight: 'bold'}}>📝 Personalização:</div>
                      <div style={{fontSize: '11px', color: '#b45309'}}>
                        {pedido.personalizacao.nome} | {pedido.personalizacao.idade} anos
                      </div>
                    </div>
                  )}
                </td>

                <td style={styles.td}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: 'center' }}>
                    <button 
                      onClick={() => alternarPago(pedido.id, pedido.pago)}
                      style={{ ...styles.actionBtn, backgroundColor: pedido.pago ? "#2ecc71" : "#e74c3c" }}
                    >
                      {pedido.pago ? "PAGO" : "PENDENTE"}
                    </button>
                    
                    <button 
                      onClick={() => alternarStatus(pedido.id, pedido.status)}
                      style={{ ...styles.actionBtn, backgroundColor: getStatusColor(pedido.status) }}
                    >
                      {pedido.status.toUpperCase()}
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
  actionBtn: { border: "none", color: "#fff", padding: "6px 10px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "10px", minWidth: "105px" } 
};