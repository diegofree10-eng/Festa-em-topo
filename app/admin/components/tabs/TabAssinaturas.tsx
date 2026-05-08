"use client";
import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { 
  FiSearch, FiUser, FiPauseCircle, FiPlayCircle, 
  FiRefreshCw, FiTrash2, FiClock, FiFilter, FiX 
} from "react-icons/fi";

interface TabAssinaturasProps {
  lojistas: any[];
  planos: any;
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabAssinaturas({ lojistas, planos, mostrarAviso }: TabAssinaturasProps) {
  const [busca, setBusca] = useState("");
  const [filtroVencidos, setFiltroVencidos] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // ESTADOS PARA O MODAL DE SEGURANÇA
  const [modalAberto, setModalAberto] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState<any>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [acaoTipo, setAcaoTipo] = useState<"limpar" | "excluir" | null>(null);

  // 1. LÓGICA DE CÁLCULO DE STATUS
  const obterStatusVencimento = (dataVencimento: string) => {
    if (!dataVencimento) return { texto: "Sem data", cor: "#94a3b8", alerta: false };
    const hoje = new Date();
    const venc = new Date(dataVencimento);
    const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { texto: "VENCIDO", cor: "#ef4444", alerta: true };
    if (diffDays <= 5) return { texto: `Vence em ${diffDays}d`, cor: "#f59e0b", alerta: true };
    return { texto: `${diffDays} dias restantes`, cor: "#10b981", alerta: false };
  };

  // 2. FILTRAGEM
  const lojistasFiltrados = lojistas.filter((l) => {
    const termo = busca.toLowerCase().trim();
    const statusVenc = obterStatusVencimento(l.dataVencimento);
    const bateFiltro = filtroVencidos ? statusVenc.alerta : true;
    return (
      ((l.nomeLoja || "").toLowerCase().includes(termo) || 
      (l.cpfResponsavel || "").includes(termo)) && bateFiltro
    );
  });

  const lojistasExibidos = lojistasFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina, 
    paginaAtual * itensPorPagina
  );

  // --- FUNÇÕES DE AÇÃO ---

  async function alterarCicloECalcularVencimento(id: string, novoCiclo: "mensal" | "anual", planoNome: string) {
    const diasDeBanhos = planos[planoNome]?.diasTeste || 0;
    
    const data = new Date();
    if (novoCiclo === "mensal") {
      data.setMonth(data.getMonth() + 1);
    } else {
      data.setFullYear(data.getFullYear() + 1);
    }

    data.setDate(data.getDate() + diasDeBanhos);
    const novaData = data.toISOString().split('T')[0];

    try {
      await updateDoc(doc(db, "lojistas", id), { 
        ciclo: novoCiclo, 
        dataVencimento: novaData,
        isTeste: false 
      });
      mostrarAviso(`Ciclo ${novoCiclo} atualizado com +${diasDeBanhos} dias de teste/carência!`);
    } catch (e) { 
      mostrarAviso("Erro ao atualizar ciclo.", "erro"); 
    }
  }

  const abrirConfirmacao = (loja: any, tipo: "limpar" | "excluir") => {
    setLojaSelecionada(loja);
    setAcaoTipo(tipo);
    setConfirmacaoTexto("");
    setModalAberto(true);
  };

  const executarAcaoSegura = async () => {
    if (confirmacaoTexto !== lojaSelecionada.nomeLoja) {
      mostrarAviso("O nome da loja não coincide!", "erro");
      return;
    }

    try {
      if (acaoTipo === "excluir") {
        // 1. Remove da coleção lojistas
        await deleteDoc(doc(db, "lojistas", lojaSelecionada.id));
        // 2. Remove o vínculo de segurança (usuarios)
        await deleteDoc(doc(db, "usuarios", lojaSelecionada.id));
        
        mostrarAviso("Loja e vínculo de segurança removidos com sucesso!");
      } else {
        // Limpeza de dados (Reset da Loja)
        await updateDoc(doc(db, "lojistas", lojaSelecionada.id), {
          vendas: [], visitas: 0, cupons: {}
        });
        mostrarAviso("Estatísticas da loja limpas!");
      }
      setModalAberto(false);
    } catch (e) {
      mostrarAviso("Erro ao processar ação.", "erro");
    }
  };

  return (
    <div style={styles.container}>
      {/* MODAL DE SEGURANÇA */}
      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h4 style={{ color: acaoTipo === 'excluir' ? '#ef4444' : '#3b82f6' }}>
                {acaoTipo === 'excluir' ? 'Confirmar Exclusão' : 'Confirmar Limpeza'}
              </h4>
              <button onClick={() => setModalAberto(false)} style={styles.btnClose}><FiX /></button>
            </div>
            <p style={styles.modalText}>
              Esta ação é <strong>irreversível</strong>. Para continuar, digite o nome da loja: <br />
              <span style={styles.nomeDestaque}>"{lojaSelecionada?.nomeLoja}"</span>
            </p>
            <input 
              type="text" 
              placeholder="Digite o nome aqui..." 
              value={confirmacaoTexto} 
              onChange={(e) => setConfirmacaoTexto(e.target.value)}
              style={styles.modalInput}
            />
            <button 
              onClick={executarAcaoSegura} 
              disabled={confirmacaoTexto !== lojaSelecionada?.nomeLoja}
              style={{
                ...styles.btnConfirmar, 
                backgroundColor: acaoTipo === 'excluir' ? '#ef4444' : '#3b82f6',
                opacity: confirmacaoTexto !== lojaSelecionada?.nomeLoja ? 0.5 : 1
              }}
            >
              Confirmar e Prosseguir
            </button>
          </div>
        </div>
      )}

      {/* HEADER E FILTROS */}
      <div style={styles.headerFlex}>
        <div style={styles.headerText}>
          <h3 style={styles.title}>Gestão de Assinaturas</h3>
          <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
            <p style={styles.sub}>Total: {lojistasFiltrados.length}</p>
            <button onClick={() => setFiltroVencidos(!filtroVencidos)} style={{...styles.btnFilter, backgroundColor: filtroVencidos ? '#fee2e2' : '#f1f5f9', color: filtroVencidos ? '#ef4444' : '#64748b'}}>
              <FiFilter /> {filtroVencidos ? "Ver Todos" : "Ver Vencidos"}
            </button>
          </div>
        </div>
        <div style={styles.searchWrapper}>
          <FiSearch style={styles.searchIcon} />
          <input type="text" placeholder="Nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      {/* TABELA DE LOJISTAS */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>LOJA / CADASTRO</th>
              <th style={styles.th}>PLANO</th>
              <th style={styles.th}>CICLO</th>
              <th style={styles.th}>VENCIMENTO / ACESSO</th>
              <th style={styles.th}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {lojistasExibidos.map((loja) => {
              const statusVenc = obterStatusVencimento(loja.dataVencimento);
              return (
                <tr key={loja.id} style={{...styles.tr, borderLeft: statusVenc.alerta ? '4px solid #ef4444' : '4px solid transparent'}}>
                  <td style={styles.td}>
                    <div style={styles.lojaInfo}>
                      <div style={styles.avatarLoja}><FiUser /></div>
                      <div>
                        <strong style={styles.nomeLoja}>{loja.nomeLoja}</strong>
                        <small style={styles.cpfLoja}>
                          Cadastrado: {loja.dataCadastro ? new Date(loja.dataCadastro).toLocaleDateString('pt-BR') : '---'}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <select 
                      value={loja.plano} 
                      onChange={(e) => updateDoc(doc(db, "lojistas", loja.id), {plano: e.target.value})} 
                      style={styles.select}
                    >
                      <option value="Bronze">Bronze</option>
                      <option value="Prata">Prata</option>
                      <option value="Ouro">Ouro</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.cicloToggle}>
                      <button 
                        onClick={() => alterarCicloECalcularVencimento(loja.id, "mensal", loja.plano)} 
                        style={{...styles.btnToggle, ...(loja.ciclo === "mensal" ? styles.activeM : {})}}
                      >M</button>
                      <button 
                        onClick={() => alterarCicloECalcularVencimento(loja.id, "anual", loja.plano)} 
                        style={{...styles.btnToggle, ...(loja.ciclo === "anual" ? styles.activeA : {})}}
                      >A</button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{color: statusVenc.cor, fontWeight: '800', fontSize: '12px'}}>
                      {loja.dataVencimento ? new Date(loja.dataVencimento).toLocaleDateString('pt-BR') : 'Aguardando'}
                    </div>
                    <div style={{fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8'}}>
                      <FiClock size={10} /> {loja.ultimoLogin ? new Date(loja.ultimoLogin).toLocaleDateString('pt-BR') : 'Sem acesso'}
                    </div>
                  </td>
                  <td style={styles.td}>
                     <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                        <button onClick={() => updateDoc(doc(db, "lojistas", loja.id), {status: loja.status === 'suspenso' ? 'ativo' : 'suspenso'})} style={styles.btnAction} title="Suspender/Ativar">
                          {loja.status === 'suspenso' ? <FiPlayCircle color="#10b981" size={18}/> : <FiPauseCircle color="#f59e0b" size={18}/>}
                        </button>
                        <button onClick={() => abrirConfirmacao(loja, "limpar")} style={styles.btnAction} title="Limpar Dados">
                          <FiRefreshCw color="#3b82f6" size={16}/>
                        </button>
                        <button onClick={() => abrirConfirmacao(loja, "excluir")} style={styles.btnAction} title="Excluir">
                          <FiTrash2 color="#ef4444" size={18}/>
                        </button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: any = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 },
  sub: { fontSize: '12px', color: '#64748b', fontWeight: 'bold' },
  btnFilter: { border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
  searchWrapper: { position: 'relative', width: '250px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '10px 10px 10px 35px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '13px', outline: 'none' },
  tableContainer: { background: "#fff", borderRadius: "20px", overflow: 'hidden', boxShadow: "0 4px 10px rgba(0,0,0,0.02)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "15px 20px", textAlign: 'left', background: '#f8fafc', color: '#64748b', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  td: { padding: "15px 20px", borderBottom: "1px solid #f1f5f9" },
  tr: { transition: '0.2s' },
  lojaInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarLoja: { width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' },
  nomeLoja: { display: 'block', fontSize: '14px', color: '#1e293b' },
  cpfLoja: { fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' },
  select: { padding: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' },
  cicloToggle: { display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', width: 'fit-content' },
  btnToggle: { border: 'none', background: 'transparent', padding: '4px 10px', fontSize: '10px', fontWeight: '900', borderRadius: '6px', cursor: 'pointer', color: '#94a3b8' },
  activeM: { background: '#10b981', color: '#fff' },
  activeA: { background: '#3b82f6', color: '#fff' },
  btnAction: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalContent: { background: '#fff', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' },
  modalText: { fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' },
  nomeDestaque: { display: 'block', margin: '10px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', textAlign: 'center', background: '#f8fafc', padding: '10px', borderRadius: '10px' },
  modalInput: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' },
  btnConfirmar: { width: '100%', padding: '14px', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }
};