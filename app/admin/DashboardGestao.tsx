"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

// --- INTERFACES PARA TIPAGEM ---
interface ItemPedido {
  nome: string;
  qty: number;
  preco: number;
}

interface Pedido {
  id: string;
  data: string;
  cliente: string;
  numeroPedido: string | number;
  devolvido: boolean;
  financeiro: {
    total: number;
    frete: number;
  };
  itens: ItemPedido[];
}

// --- CONFIGURAÇÕES E UTILITÁRIOS ---
const TABELA_CUSTOS: Record<string, number> = {
  "Convite Marsala": 2.50,
  "Convite One Peace": 1.80,
  "Topo de Bolo Simples": 5.00,
  "Topo de Bolo Luxo": 12.00,
  "Digital": 0.00,
};
const CUSTO_PADRAO_GENERICO = 2.00;

const formatarMoeda = (valor: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

const INFO_ABAS: Record<string, string> = {
  vendas: "Visualize pedidos. Clique no nome do cliente para ver itens e frete.",
  catalogo: "Ranking de lucro por produto. Identifique o que mais põe dinheiro no seu bolso.",
  sazonalidade: "Desempenho mensal para identificar meses de pico.",
  clientes: "Lista de clientes fiéis baseada no lucro real que eles deixam para a empresa.",
  lucro: "Cálculo matemático: Faturamento (-) Custos de Produção = Sobra Real.",
  devolucoes: "Histórico de cancelados. Valores removidos automaticamente dos totais."
};

// --- SUB-COMPONENTE PARA PERFORMANCE ---
const LinhaPedido = React.memo(({ pedido, expandido, onExpandir, onDevolver }: any) => {
  return (
    <React.Fragment>
      <tr style={{...styles.tr, background: expandido ? '#f0f7ff' : 'transparent', transition: '0.3s'}}>
        <td style={styles.td}>{pedido.data?.split(",")[0]}</td>
        <td 
          style={{...styles.td, cursor: 'pointer', color: '#3498db', fontWeight: 'bold'}} 
          onClick={() => onExpandir(pedido.id)}
        >
          👤 {pedido.cliente} {expandido ? '🔼' : '🔽'}
        </td>
        <td style={styles.td}>{formatarMoeda(Number(pedido.financeiro?.total))}</td>
        <td style={styles.td}>
          <button onClick={() => onDevolver(pedido.id, pedido.devolvido)} style={styles.btnDevolver}>
            {pedido.devolvido ? 'Restaurar' : 'Devolver'}
          </button>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={4} style={styles.detalheBox}>
            <div style={styles.expandInfo}>
              <div style={styles.expandHeader}>
                <strong>Pedido: #{pedido.numeroPedido}</strong>
                <span style={{color: '#e67e22', fontWeight: 'bold'}}>Frete: {formatarMoeda(Number(pedido.financeiro?.frete))}</span>
              </div>
              <ul style={{margin: 0, paddingLeft: '20px', fontSize: '13px'}}>
                {pedido.itens?.map((it: ItemPedido, idx: number) => (
                  <li key={idx} style={{marginBottom: '4px'}}>
                    {it.qty}x {it.nome} — <span style={{color: '#666'}}>{formatarMoeda(Number(it.preco))} un.</span>
                  </li>
                ))}
              </ul>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

LinhaPedido.displayName = "LinhaPedido";

export default function DashboardGestao() {
  const router = useRouter();
  
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("vendas"); 
  const [buscaNome, setBuscaNome] = useState("");
  const [dataInicio, setDataInicio] = useState(""); 
  const [dataFim, setDataFim] = useState("");
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          // Validação de acesso admin/master
          if (userData.lojaId && (userData.role === 'master' || userData.role === 'admin')) {
            const idIdentificado = userData.lojaId;
            setLojaId(idIdentificado);

            const q = query(
              collection(db, "lojistas", idIdentificado, "registros_pedidos"), 
              orderBy("numeroPedido", "desc")
            );

            const unsubDocs = onSnapshot(q, (snap) => {
              const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));
              setPedidos(docs);
              setLoading(false);
            }, (error) => {
              console.error("Erro ao carregar dados:", error);
              setLoading(false);
            });

            return () => unsubDocs();
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, [router]);

  const parseDataPedido = (dataStr: string) => {
    if (!dataStr) return null;
    const [dia, mes, ano] = dataStr.split(",")[0].trim().split("/");
    return new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0);
  };

  const alternarDevolucao = useCallback(async (id: string, statusAtual: boolean) => {
    if(!lojaId) return;
    const msg = statusAtual ? "Reativar este pedido?" : "Confirmar DEVOLUÇÃO?";
    if (confirm(msg)) {
      await updateDoc(doc(db, "lojistas", lojaId, "registros_pedidos", id), { devolvido: !statusAtual });
    }
  }, [lojaId]);

  const inteligencia = useMemo(() => {
    const i = {
      faturamento: 0, lucroReal: 0, custoTotal: 0, perdaDevolucao: 0,
      totalPedidosValidos: 0, 
      rankingProdutos: {} as Record<string, any>, 
      clientesEstrela: {} as Record<string, any>,
      sazonalidade: Array(12).fill(0),
      nomesMeses: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    };

    pedidos.forEach(p => {
      const dataPedido = parseDataPedido(p.data);
      const valorTotal = Number(p.financeiro?.total || 0);
      
      let matchData = true;
      if (dataInicio && dataPedido && dataPedido < new Date(dataInicio + "T00:00:00")) matchData = false;
      if (dataFim && dataPedido && dataPedido > new Date(dataFim + "T23:59:59")) matchData = false;
      if (!matchData) return;

      if (p.devolvido) {
        i.perdaDevolucao += valorTotal;
        return; 
      }

      i.faturamento += valorTotal;
      i.totalPedidosValidos += 1;
      if (dataPedido) i.sazonalidade[dataPedido.getMonth()] += valorTotal;

      const nomeCli = p.cliente || "Anônimo";
      if (!i.clientesEstrela[nomeCli]) i.clientesEstrela[nomeCli] = { compras: 0, total: 0, lucro: 0 };
      i.clientesEstrela[nomeCli].compras += 1;
      i.clientesEstrela[nomeCli].total += valorTotal;

      p.itens?.forEach((item: ItemPedido) => {
        const n = item.nome || "Sem Nome";
        const q = Number(item.qty || 0);
        const custoUnit = TABELA_CUSTOS[n] !== undefined ? TABELA_CUSTOS[n] : CUSTO_PADRAO_GENERICO;
        const lucroItem = (Number(item.preco || 0) * q) - (custoUnit * q);
        
        i.custoTotal += (custoUnit * q);
        i.lucroReal += lucroItem;
        i.clientesEstrela[nomeCli].lucro += lucroItem;

        if (q > 0) {
          if (!i.rankingProdutos[n]) i.rankingProdutos[n] = { qtd: 0, valor: 0, lucro: 0 };
          i.rankingProdutos[n].qtd += q;
          i.rankingProdutos[n].valor += (q * Number(item.preco || 0));
          i.rankingProdutos[n].lucro += lucroItem;
        }
      });
    });
    return i;
  }, [pedidos, dataInicio, dataFim]);

  const dadosFiltradosBusca = useMemo(() => {
    return pedidos.filter(p => {
      const matchNome = !buscaNome || (p.cliente || "").toLowerCase().includes(buscaNome.toLowerCase());
      const dataP = parseDataPedido(p.data);
      let matchData = true;
      if (dataInicio && dataP && dataP < new Date(dataInicio + "T00:00:00")) matchData = false;
      if (dataFim && dataP && dataP > new Date(dataFim + "T23:59:59")) matchData = false;
      return matchNome && matchData;
    });
  }, [pedidos, buscaNome, dataInicio, dataFim]);

  if (loading) return <div style={styles.loading}>Sincronizando Dashboard...</div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1>📈 Gestão de Lucratividade</h1>
          <button onClick={() => router.back()} style={styles.btnVoltar}>⬅️ Voltar</button>
        </div>

        <div style={styles.filtrosCard}>
          <input type="text" placeholder="🔍 Buscar cliente..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} style={styles.input} />
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={styles.input} />
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={styles.input} />
          <button onClick={() => { 
            const hoje = new Date().toISOString().split('T')[0];
            setDataInicio(hoje); setDataFim(hoje);
          }} style={styles.btnAtalho}>Hoje</button>
          <button onClick={() => { setBuscaNome(""); setDataInicio(""); setDataFim(""); }} style={styles.btnLimpar}>Limpar</button>
        </div>

        <div style={styles.tabBar}>
          {['vendas', 'catalogo', 'sazonalidade', 'clientes', 'lucro', 'devolucoes'].map(t => (
            <button key={t} style={abaAtiva === t ? styles.tabActive : styles.tab} onClick={() => { setAbaAtiva(t); setPedidoExpandido(null); }}>
              {t === 'lucro' ? '💰 LUCRO REAL' : t === 'devolucoes' ? '🔄 DEVOLVIDOS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div style={styles.grid}>
        <div style={{...styles.card, borderLeft: '5px solid #2ecc71'}}>
          <span style={styles.cardLabel}>Faturamento</span>
          <h2 style={styles.cardVal}>{formatarMoeda(inteligencia.faturamento)}</h2>
        </div>
        <div style={{...styles.card, borderLeft: `5px solid ${inteligencia.lucroReal >= 0 ? '#27ae60' : '#e74c3c'}`}}>
          <span style={styles.cardLabel}>Lucro Real</span>
          <h2 style={{...styles.cardVal, color: inteligencia.lucroReal >= 0 ? '#27ae60' : '#e74c3c'}}>{formatarMoeda(inteligencia.lucroReal)}</h2>
        </div>
        <div style={{...styles.card, borderLeft: '5px solid #3498db'}}>
          <span style={styles.cardLabel}>Ticket Médio</span>
          <h2 style={{...styles.cardVal, color: '#3498db'}}>{formatarMoeda(inteligencia.faturamento / (inteligencia.totalPedidosValidos || 1))}</h2>
        </div>
        <div style={{...styles.card, borderLeft: '5px solid #e74c3c'}}>
          <span style={styles.cardLabel}>Perda (Devoluções)</span>
          <h2 style={{...styles.cardVal, color: '#e74c3c'}}>{formatarMoeda(inteligencia.perdaDevolucao)}</h2>
        </div>
      </div>

      <section style={styles.section}>
        <div style={styles.abaHeader}>
            <h3 style={{margin: 0}}>{abaAtiva.toUpperCase()}</h3>
            <button style={styles.infoTooltip} onClick={() => alert(INFO_ABAS[abaAtiva])}>ℹ️</button>
        </div>

        {abaAtiva === 'vendas' && (
           <table style={styles.table}>
             <thead><tr style={styles.thRow}><th style={styles.th}>Data</th><th style={styles.th}>Cliente</th><th style={styles.th}>Total</th><th style={styles.th}>Ação</th></tr></thead>
             <tbody>
               {dadosFiltradosBusca.filter(p => !p.devolvido).map(p => (
                 <LinhaPedido 
                  key={p.id} 
                  pedido={p} 
                  expandido={pedidoExpandido === p.id} 
                  onExpandir={(id: string) => setPedidoExpandido(pedidoExpandido === id ? null : id)} 
                  onDevolver={alternarDevolucao} 
                 />
               ))}
             </tbody>
           </table>
        )}

        {abaAtiva === 'catalogo' && (
          <table style={styles.table}>
            <thead><tr style={styles.thRow}><th style={styles.th}>Produto</th><th style={styles.th}>Qtd</th><th style={styles.th}>Lucro Total</th><th style={styles.th}>Margem</th></tr></thead>
            <tbody>
              {Object.entries(inteligencia.rankingProdutos).sort((a:any, b:any) => b[1].lucro - a[1].lucro).map(([nome, d]: any) => (
                <tr key={nome} style={styles.trStatic}>
                  <td style={styles.td}>{nome}</td>
                  <td style={styles.td}>{d.qtd} un.</td>
                  <td style={styles.td}><strong style={{color: '#27ae60'}}>{formatarMoeda(d.lucro)}</strong></td>
                  <td style={styles.td}>
                    <span style={{...styles.badge, background: (d.lucro/d.valor) > 0.5 ? '#dcfce7' : '#fef9c3', color: (d.lucro/d.valor) > 0.5 ? '#166534' : '#854d0e'}}>
                      {((d.lucro / (d.valor || 1)) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {abaAtiva === 'sazonalidade' && (
          <div style={{padding: '20px'}}>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px', height: '200px', borderBottom: '2px solid #eee'}}>
              {inteligencia.sazonalidade.map((valor, idx) => {
                const altura = (valor / (Math.max(...inteligencia.sazonalidade) || 1)) * 100;
                return (
                  <div key={idx} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end'}}>
                    <div style={{width: '100%', background: '#3498db', height: `${altura}%`, borderRadius: '4px 4px 0 0', transition: '0.5s'}} title={formatarMoeda(valor)}></div>
                    <span style={{fontSize: '10px', marginTop: '5px'}}>{inteligencia.nomesMeses[idx]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {abaAtiva === 'clientes' && (
          <table style={styles.table}>
            <thead><tr style={styles.thRow}><th style={styles.th}>Cliente</th><th style={styles.th}>Pedidos</th><th style={styles.th}>Lucro Gerado</th></tr></thead>
            <tbody>
              {Object.entries(inteligencia.clientesEstrela).sort((a:any, b:any) => b[1].lucro - a[1].lucro).map(([nome, d]: any) => (
                <tr key={nome} style={styles.trStatic}>
                  <td style={styles.td}>👤 {nome}</td>
                  <td style={styles.td}>{d.compras} pedidos</td>
                  <td style={styles.td}><strong style={{color: '#27ae60'}}>{formatarMoeda(d.lucro)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {abaAtiva === 'lucro' && (
          <div style={{padding: '40px 0'}}>
            <div style={styles.lucroBox}>
              <div style={styles.lucroItem}><span>Vendas Líquidas:</span><strong style={{color: '#2ecc71'}}>+ {formatarMoeda(inteligencia.faturamento)}</strong></div>
              <div style={styles.lucroItem}><span>Custos de Produção:</span><strong style={{color: '#e74c3c'}}>- {formatarMoeda(inteligencia.custoTotal)}</strong></div>
              <hr style={styles.hr} />
              <div style={styles.lucroItem}><span>Resultado Final:</span><strong style={{fontSize: '28px', color: inteligencia.lucroReal >= 0 ? '#27ae60' : '#e74c3c'}}>{formatarMoeda(inteligencia.lucroReal)}</strong></div>
            </div>
          </div>
        )}

        {abaAtiva === 'devolucoes' && (
          <table style={styles.table}>
            <thead><tr style={styles.thRow}><th style={styles.th}>Data</th><th style={styles.th}>Cliente</th><th style={styles.th}>Valor Estornado</th><th style={styles.th}>Ação</th></tr></thead>
            <tbody>
              {dadosFiltradosBusca.filter(p => p.devolvido).map(p => (
                <tr key={p.id} style={{...styles.tr, background: '#fff5f5'}}>
                  <td style={styles.td}>{p.data?.split(",")[0]}</td>
                  <td style={styles.td}>{p.cliente}</td>
                  <td style={styles.td}>{formatarMoeda(Number(p.financeiro?.total))}</td>
                  <td style={styles.td}><button onClick={() => alternarDevolucao(p.id, true)} style={styles.btnRestaurar}>Restaurar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// --- ESTILOS MANTIDOS ---
const styles: Record<string, React.CSSProperties> = {
  page: { padding: "20px 40px", background: "#f4f7f6", minHeight: "100vh", fontFamily: "sans-serif" },
  loading: { padding: '100px', textAlign: 'center', fontSize: '20px', color: '#666' },
  header: { marginBottom: '20px' },
  btnVoltar: { padding: "8px 15px", borderRadius: '6px', border: 'none', background: '#2c3e50', color: '#fff', cursor: 'pointer' },
  filtrosCard: { background: '#fff', padding: '15px', borderRadius: '10px', display: 'flex', gap: '10px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', alignItems: 'center' },
  input: { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', flex: 1 },
  btnAtalho: { background: '#f0f4f8', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', color: '#3498db', fontWeight: 'bold', fontSize: '12px' },
  btnLimpar: { background: '#eee', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', color: '#666', fontSize: '12px' },
  tabBar: { display: 'flex', gap: '5px', borderBottom: '2px solid #ddd', marginBottom: '20px' },
  tab: { padding: '10px 15px', cursor: 'pointer', color: '#666', background: 'none', border: 'none', borderBottom: '3px solid transparent', outline: 'none', transition: '0.2s' },
  tabActive: { padding: '10px 15px', cursor: 'pointer', color: '#3498db', fontWeight: 'bold', background: 'none', border: 'none', borderBottom: '3px solid #3498db' },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 15, marginBottom: 20 },
  card: { background: "#fff", padding: "15px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  cardLabel: { fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  cardVal: { fontSize: '22px', margin: '5px 0 0 0', fontWeight: 'bold' },
  section: { background: "#fff", padding: "20px", borderRadius: "10px", minHeight: '400px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  abaHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' },
  infoTooltip: { cursor: 'pointer', background: '#f0f0f0', border: 'none', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { textAlign: 'left', borderBottom: '1px solid #eee' },
  th: { padding: "12px", fontSize: '11px', color: '#999', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #eee' },
  trStatic: { borderBottom: '1px solid #eee' },
  td: { padding: "12px", fontSize: '14px' },
  badge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  btnDevolver: { padding: '5px 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  btnRestaurar: { padding: '5px 10px', background: '#e0f2fe', color: '#0ea5e9', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  detalheBox: { padding: '10px 20px 20px 20px' },
  expandInfo: { padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  expandHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '8px' },
  lucroBox: { maxWidth: '450px', margin: '0 auto', padding: '30px', border: '1px solid #eee', borderRadius: '15px', background: '#fcfcfc', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  lucroItem: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px' },
  hr: { border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }
};