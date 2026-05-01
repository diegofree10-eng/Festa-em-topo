"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

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
  numeroPedido: number;
  status: string;
  pago: boolean;
  data: string;
  itens: ItemPedido[];
  endereco?: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  financeiro?: {
    total: number;
    subtotal?: number;
    frete?: number;
  };
  personalizacao?: any; 
  createdAt?: number;
}

export default function AdminPedidos() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lojaId = searchParams.get("loja"); 
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // --- FUNÇÃO DE IMPRESSÃO ---
  const imprimirSelecionados = () => {
    if (selecionados.length === 0) {
      alert("Selecione os pedidos na lista para imprimir!");
      return;
    }

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const pedidosParaImprimir = pedidos.filter(p => selecionados.includes(p.id));
    const janelaImpressao = window.open('', '', 'width=1000,height=900');
    
    if (!janelaImpressao) return;

    janelaImpressao.document.write(`
      <html>
        <head>
          <title>Relatório de Produção - ${dataAtual}</title>
          <style>
            @page { size: portrait; margin: 5mm; }
            body { font-family: sans-serif; font-size: 10px; margin: 0; padding: 5px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word; }
            th { background-color: #f2f2f2; font-size: 9px; text-transform: uppercase; padding: 6px; }
            .col-ok { width: 30px; text-align: center; vertical-align: middle; }
            .col-numero { width: 45px; text-align: center; font-weight: bold; vertical-align: middle; }
            .col-cliente { width: 180px; padding: 6px; }
            .row-item { display: flex; border-bottom: 1px solid #000; min-height: 30px; }
            .item-nome { flex: 1; padding: 6px; border-right: 1px solid #000; }
            .item-info { width: 90px; padding: 6px; font-size: 9px; }
            .tag-variacao { color: #b80606; font-weight: bold; font-size: 9px; }
            h2 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          <h2>Relatório de Produção - ${dataAtual}</h2>
          <table>
            <thead>
              <tr>
                <th class="col-ok">OK</th>
                <th class="col-numero">Ped.</th>
                <th class="col-cliente">Cliente</th>
                <th class="col-itens">Itens / Variações</th>
                <th class="col-perso">Personalização</th>
              </tr>
            </thead>
            <tbody>
              ${pedidosParaImprimir.map(p => `
                <tr>
                  <td class="col-ok"> [ ] </td>
                  <td class="col-numero">#${p.numeroPedido}</td>
                  <td class="col-cliente"><b>${p.cliente}</b></td>
                  <td colspan="2">
                    ${p.itens?.map(item => {
                      let infoPerso = "---";
                      if (p.personalizacao?.kitFesta?.nome) {
                        infoPerso = p.personalizacao.kitFesta.nome + " / " + p.personalizacao.kitFesta.idade;
                      }
                      return `
                        <div class="row-item">
                          <div class="item-nome">
                            <b>${item.qty}x</b> ${item.nome} 
                            ${item.variacao ? '<span class="tag-variacao">(' + item.variacao + ')</span>' : ''}
                          </div>
                          <div class="item-info">${infoPerso}</div>
                        </div>
                      `;
                    }).join('')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  // --- FUNÇÕES FIREBASE ---
  useEffect(() => {
    if (!lojaId) return;
    
    const q = query(collection(db, "lojistas", lojaId, "registros_pedidos"), orderBy("numeroPedido", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Pedido[]; 
      setPedidos(lista);
      setLoading(false);
    });
    return () => unsub();
  }, [lojaId]);

  const pedidosFiltrados = pedidos.filter(p => {
    const matchBusca = p.cliente?.toLowerCase().includes(busca.toLowerCase()) || p.numeroPedido?.toString().includes(busca);
    const matchStatus = filtroStatus === "Todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const toggleSelecao = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleTodos = () => {
    if (selecionados.length === pedidosFiltrados.length) setSelecionados([]);
    else setSelecionados(pedidosFiltrados.map(p => p.id));
  };

  return (
    <div style={styles.contentArea}>
      <div style={styles.header}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
           <h2 style={{fontSize: '20px', color: '#1e293b', margin: 0}}>📋 Gestão de Pedidos</h2>
           <button 
             onClick={imprimirSelecionados} 
             style={{...styles.btnMassPrint, backgroundColor: selecionados.length > 0 ? "#2c3e50" : "#94a3b8"}}
           >
             🖨️ Imprimir Selecionados ({selecionados.length})
           </button>
        </div>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.statusTabs}>
          {["Todos", "Pendente", "Em Produção", "Concluído"].map(status => (
            <button 
              key={status} 
              onClick={() => {setFiltroStatus(status); setSelecionados([]);}} 
              style={{ 
                ...styles.tabBtn, 
                backgroundColor: filtroStatus === status ? "#2c3e50" : "transparent", 
                color: filtroStatus === status ? "#fff" : "#64748b" 
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="🔍 Buscar cliente ou número..." 
          value={busca} 
          onChange={(e) => setBusca(e.target.value)} 
          style={styles.searchInput} 
        />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={{...styles.th, width: '40px'}}>
                <input type="checkbox" checked={selecionados.length === pedidosFiltrados.length && pedidosFiltrados.length > 0} onChange={toggleTodos} />
              </th>
              <th style={styles.th}>Nº</th>
              <th style={styles.th}>Cliente / Endereço</th>
              <th style={styles.th}>Itens / Personalização</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id} style={{ 
                ...styles.tr, 
                backgroundColor: selecionados.includes(pedido.id) ? "#f0f9ff" : (pedido.pago ? "#f0fdf4" : "#fff") 
              }}>
                <td style={styles.td}>
                  <input type="checkbox" checked={selecionados.includes(pedido.id)} onChange={() => toggleSelecao(pedido.id)} />
                </td>
                <td style={styles.tdBold}>#{pedido.numeroPedido}</td>
                
                <td style={styles.td}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontWeight: 'bold'}}>{pedido.cliente}</span>
                    {pedido.whatsapp && (
                      <a href={`https://wa.me/55${pedido.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={styles.whatsappIcon}>💬</a>
                    )}
                  </div>
                  <div style={styles.enderecoText}>
                    {pedido.endereco ? `📍 ${pedido.endereco.cidade}/${pedido.endereco.uf}` : "📦 Digital / Retirada"}
                  </div>
                </td>

                <td style={styles.td}>
                  {pedido.itens?.map((item, idx) => (
                    <div key={idx} style={styles.itemLine}>
                      <strong>{item.qty}x</strong> {item.nome}
                    </div>
                  ))}
                </td>

                <td style={styles.td}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={() => updateDoc(doc(db, "lojistas", lojaId!, "registros_pedidos", pedido.id), { pago: !pedido.pago })}
                      style={{ ...styles.actionBtn, backgroundColor: pedido.pago ? "#2ecc71" : "#e74c3c" }}
                    >
                      {pedido.pago ? "PAGO" : "PED"}
                    </button>
                    <button 
                      onClick={() => {
                        const proximos: any = {"Pendente":"Em Produção", "Em Produção":"Concluído", "Concluído":"Pendente"};
                        updateDoc(doc(db, "lojistas", lojaId!, "registros_pedidos", pedido.id), { status: proximos[pedido.status] || "Pendente" });
                      }}
                      style={{ ...styles.actionBtn, backgroundColor: "#94a3b8" }}
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
  contentArea: { padding: "10px", width: "100%", boxSizing: "border-box" },
  header: { marginBottom: "20px" },
  btnMassPrint: { padding: "8px 16px", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: 'pointer', fontSize: '12px' },
  filterBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "10px" },
  statusTabs: { display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px" },
  tabBtn: { border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" },
  searchInput: { padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "250px" },
  tableContainer: { background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#f8fafc", textAlign: "left" },
  th: { padding: "12px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px", fontSize: "13px" },
  tdBold: { padding: "12px", fontWeight: "bold" },
  enderecoText: { fontSize: "11px", color: "#94a3b8" },
  itemLine: { fontSize: "12px" },
  actionBtn: { border: "none", color: "#fff", padding: "5px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontWeight: "bold", minWidth: "60px" },
  whatsappIcon: { textDecoration: 'none', background: '#25D366', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }
};