"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase"; 
import { 
  collection, addDoc, doc, query, orderBy, updateDoc, 
  deleteDoc, onSnapshot, writeBatch, setDoc, getDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiDownload } from "react-icons/fi"; // Importando ícone de download

// --- IMPORTAÇÃO DOS ESTADOS E MODAIS ---
import { styles } from "./styles"; 
import RequisitosModal from "@/app/admin/components/RequisitosModal";
import VariacoesModal from "@/app/admin/components/VariacoesModal";

// --- CONFIGURAÇÃO DE SEGURANÇA E PLANOS ---
const LIMITES_PLANOS = {
  Bronze: { produtos: 60, categorias: 6 },
  Prata: { produtos: 80, categorias: 8 },
  Ouro: { produtos: 110, categorias: 10 },
};

const PALAVRAS_PROIBIDAS = [
  "admin", "master", "suporte", "festaemtopo", "root", "null", 
  "undefined", "api", "vendas", "financeiro", "ajuda", "config",
  "sistema", "login", "auth", "teste", "gerente", "houseconviteria",
  "chefe"
];

export default function CadastroProdutos() {
  const [uid, setUid] = useState<string | null>(null);
  const [planoLojista, setPlanoLojista] = useState("Bronze");
  const [planosMaster, setPlanosMaster] = useState<any>(null);
  const [limites, setLimites] = useState({ produtos: 0, categorias: 0 });
  
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precoBasico, setPrecoBasico] = useState("");
  const [custoUnitario, setCustoUnitario] = useState(""); 
  const [ativo, setAtivo] = useState(true);
  const [precisaFrete, setPrecisaFrete] = useState(true);
  const [peso, setPeso] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [imagens, setImagens] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [requisitos, setRequisitos] = useState({ 
    pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false 
  });
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [modoMassa, setModoMassa] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [showVarModal, setShowVarModal] = useState(false);
  const [nomeVar1, setNomeVar1] = useState("Cor");
  const [opcoesVar1, setOpcoesVar1] = useState(["Azul", "Rosa"]);
  const [nomeVar2, setNomeVar2] = useState("");
  const [opcoesVar2, setOpcoesVar2] = useState<string[]>([]);
  const [tabelaPrecos, setTabelaPrecos] = useState<any>({});

  // --- SINCRONIZAÇÃO DE LIMITES ---
  useEffect(() => {
    const unsubMaster = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanosMaster(snap.data());
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        onSnapshot(doc(db, "lojistas", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const dados = docSnap.data();
            setPlanoLojista(dados.plano || "Bronze");
          }
        });

        onSnapshot(query(collection(db, "lojistas", user.uid, "produtos"), orderBy("createdAt", "desc")), (snap) => { 
          setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        });
        onSnapshot(query(collection(db, "lojistas", user.uid, "categorias"), orderBy("nome", "asc")), (snap) => { 
          setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        });
      }
    });
    return () => { unsubMaster(); unsubAuth(); };
  }, []);

  useEffect(() => {
    const infoPlanoMaster = planosMaster?.[planoLojista];
    const infoPlanoEstatico = LIMITES_PLANOS[planoLojista as keyof typeof LIMITES_PLANOS];
    setLimites({
      produtos: infoPlanoMaster?.produtos ?? infoPlanoEstatico.produtos,
      categorias: infoPlanoMaster?.categorias ?? infoPlanoEstatico.categorias
    });
  }, [planosMaster, planoLojista]);

  // --- FUNÇÕES DE EXPORTAÇÃO CSV ---
  const exportarProdutosCSV = () => {
    if (planoLojista === "Bronze") {
      alert("A exportação de relatórios está disponível apenas nos planos Prata e Ouro.");
      return;
    }

    if (produtosFiltrados.length === 0) {
      alert("Não há produtos para exportar.");
      return;
    }

    const cabecalho = [
      "ID Produto", 
      "Nome", 
      "Variacao/Grade", 
      "Categoria", 
      "Preco Venda", 
      "Custo", 
      "Status", 
      "Peso(kg)", 
      "Medidas", 
      "Personalizavel"
    ];

    const linhas: any[] = [];

    produtosFiltrados.forEach(p => {
      if (p.temVariacoes && p.variacoes && p.variacoes.length > 0) {
        p.variacoes.forEach((v: any) => {
          linhas.push([
            p.id,
            `"${p.nome?.replace(/"/g, '""')}"`,
            `"${v.nome?.replace(/"/g, '""')}"`,
            `"${p.categoria || ""}"`,
            v.preco || p.precoBasico,
            v.custo || p.custoUnitario || "0.00",
            p.ativo ? "Visivel" : "Oculto",
            p.peso || "0",
            `${p.comprimento || 0}x${p.largura || 0}x${p.altura || 0}`,
            p.requisitos ? "Sim" : "Nao"
          ]);
        });
      } else {
        linhas.push([
          p.id,
          `"${p.nome?.replace(/"/g, '""')}"`,
          "Unico",
          `"${p.categoria || ""}"`,
          p.precoBasico,
          p.custoUnitario || "0.00",
          p.ativo ? "Visivel" : "Oculto",
          p.peso || "0",
          `${p.comprimento || 0}x${p.largura || 0}x${p.altura || 0}`,
          p.requisitos ? "Sim" : "Nao"
        ]);
      }
    });

    const csvContent = "\ufeff" + [
      cabecalho.join(";"),
      ...linhas.map(l => l.join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_completo_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    link.click();
  };

  // --- FUNÇÕES DE AUXÍLIO ---
  const comprimirImagem = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.7);
        };
      };
    });
  };

  const validarTexto = (texto: string) => {
    const t = texto.toLowerCase();
    return !PALAVRAS_PROIBIDAS.some(p => t.includes(p));
  };

  const temVariaveisComPreco = Object.values(tabelaPrecos).some((v: any) => {
    return v?.preco && v.preco.toString().trim() !== "" && parseFloat(v.preco) > 0;
  });

  const calcularLucro = (venda: string, custo: string) => {
    const v = parseFloat(venda); 
    const c = parseFloat(custo);
    if (!v || !c || c === 0) return null;
    return (((v - c) / c) * 100).toFixed(0);
  };

  const formatInput = (value: string, setter: (v: string) => void) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) { setter(""); return; }
    setter((parseInt(cleanValue) / 100).toFixed(2));
  };

  const handleInputTabela = (key: string, campo: string, valor: string) => {
    if (campo === "foto") {
      setTabelaPrecos((prev: any) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
      return;
    }
    const cleanValue = valor.replace(/\D/g, "");
    const formatted = cleanValue ? (parseInt(cleanValue) / 100).toFixed(2) : "";
    setTabelaPrecos((prev: any) => ({ ...prev, [key]: { ...prev[key], [campo]: formatted } }));
  };

  const gerarCombinacoes = () => {
    if (opcoesVar1.length === 0) return [];
    if (opcoesVar2.length === 0) return opcoesVar1.filter(v => v.trim()).map(v1 => ({ v1, v2: "", key: v1 }));
    const combos: any[] = [];
    opcoesVar1.filter(v => v.trim()).forEach(v1 => {
      opcoesVar2.filter(v => v.trim()).forEach(v2 => { combos.push({ v1, v2, key: `${v1}-${v2}` }); });
    });
    return combos;
  };

  async function uploadImagens() {
    if (!uid || imagens.length + files.length > 4) return alert("Máximo 4 fotos.");
    setUploading(true);
    for (let file of files) {
      try {
        const blob = await comprimirImagem(file);
        const storageRef = ref(storage, `lojistas/${uid}/produtos/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setImagens(prev => [...prev, downloadURL]);
      } catch (e) { console.error(e); }
    }
    setFiles([]); setUploading(false);
  }

  async function acaoEmMassa(tipo: string) {
    if (selecionados.length === 0 || !uid) return;
    const batch = writeBatch(db);
    if (tipo === 'excluir' && !confirm(`Excluir ${selecionados.length} itens?`)) return;
    let precoFormatado = "";
    if (tipo === 'preco') {
      const p = prompt("Digite o novo preço (ex: 1250 para R$ 12,50):");
      if (!p) return;
      const apenasNumeros = p.replace(/\D/g, "");
      if (!apenasNumeros) return alert("Valor inválido.");
      precoFormatado = (parseInt(apenasNumeros) / 100).toFixed(2);
    }
    for (const id of selecionados) {
      const pref = doc(db, "lojistas", uid, "produtos", id);
      if (tipo === 'ocultar') batch.update(pref, { ativo: false });
      if (tipo === 'mostrar') batch.update(pref, { ativo: true });
      if (tipo === 'excluir') batch.delete(pref);
      if (tipo === 'preco') batch.update(pref, { precoBasico: precoFormatado });
    }
    try { await batch.commit(); setSelecionados([]); setModoMassa(false); } catch (e) { alert("Erro."); }
  }

  async function salvar() {
    if (!uid) return;
    if (!editId && produtos.length >= limites.produtos) {
      alert(`Limite atingido! Seu plano permite até ${limites.produtos} produtos.`);
      return;
    }
    if (!validarTexto(nome) || !nome.trim()) return alert("Nome inválido.");
    if (!categoria) return alert("Selecione uma categoria.");
    if (imagens.length === 0) return alert("Adicione uma foto.");

    setLoading(true);
    try {
      const produtoId = editId || doc(collection(db, "lojistas", uid, "produtos")).id;
      const novaTabelaPrecos = { ...tabelaPrecos };
      const keys = Object.keys(tabelaPrecos);
      for (const key of keys) {
        const item = tabelaPrecos[key];
        if (item.foto && item.foto.startsWith("data:image")) {
          const storageRef = ref(storage, `lojistas/${uid}/produtos/${produtoId}/vars/${key}.jpg`);
          const snapshot = await uploadString(storageRef, item.foto, 'data_url');
          novaTabelaPrecos[key].foto = await getDownloadURL(snapshot.ref);
        }
      }

      const combos = gerarCombinacoes();
      const precosValidos = Object.values(novaTabelaPrecos).map((v: any) => parseFloat(v.preco)).filter(p => p > 0);
      const precoFinal = precosValidos.length > 0 ? Math.min(...precosValidos).toFixed(2) : precoBasico;

      const dados: any = {
        lojistaId: uid, nome, descricao, categoria, precoBasico: precoFinal, custoUnitario, ativo, precisaFrete,
        peso, comprimento, largura, altura, imagens, capa: imagens[0] || "",
        temVariacoes: temVariaveisComPreco,
        nomeVar1, nomeVar2, requisitos,
        variacoes: temVariaveisComPreco ? combos.map(c => ({
          nome: c.v2 ? `${c.v1} / ${c.v2}` : c.v1,
          v1: c.v1, v2: c.v2,
          preco: novaTabelaPrecos[c.key]?.preco || precoBasico,
          custo: novaTabelaPrecos[c.key]?.custo || custoUnitario,
          foto: novaTabelaPrecos[c.key]?.foto || ""
        })) : [],
        updatedAt: Date.now()
      };

      const docRef = doc(db, "lojistas", uid, "produtos", produtoId);
      if (editId) await updateDoc(docRef, dados);
      else await setDoc(docRef, { ...dados, destaque: false, createdAt: Date.now() });
      
      alert("Sucesso!");
      limparForm();
    } catch (e) { alert("Erro ao salvar."); }
    setLoading(false);
  }

  const limparForm = () => {
    setNome(""); setDescricao(""); setCategoria(""); setPrecoBasico(""); setCustoUnitario("");
    setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]); setPrecisaFrete(true);
    setOpcoesVar1(["Azul", "Rosa"]); setOpcoesVar2([]); setNomeVar1("Cor"); setNomeVar2(""); setTabelaPrecos({});
    setRequisitos({ pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });
  };

  const produtosFiltrados = produtos.filter(p => {
    return p.nome?.toLowerCase().includes(busca.toLowerCase()) &&
           (filtroCategoria === "Todos" || p.categoria === filtroCategoria) &&
           (filtroStatus === "Todos" || (filtroStatus === "Visíveis" ? p.ativo : !p.ativo));
  });

  return (
    <div style={styles.page}>
      {showDescModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{marginBottom: '10px'}}>Editar Descrição</h3>
            <textarea style={styles.modalTextarea} value={descricao} onChange={e => setDescricao(e.target.value)} autoFocus />
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
              <button onClick={() => setShowDescModal(false)} style={styles.btnSave}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      {showReqModal && (
        <RequisitosModal 
          config={requisitos} 
          onSave={(novos: any) => { setRequisitos(novos); setShowReqModal(false); }} 
          onClose={() => setShowReqModal(false)}
        />
      )}
      
      <VariacoesModal 
        showVarModal={showVarModal}
        setShowVarModal={setShowVarModal}
        nomeVar1={nomeVar1} setNomeVar1={setNomeVar1}
        opcoesVar1={opcoesVar1} setOpcoesVar1={setOpcoesVar1}
        nomeVar2={nomeVar2} setNomeVar2={setNomeVar2}
        opcoesVar2={opcoesVar2} setOpcoesVar2={setOpcoesVar2}
        tabelaPrecos={tabelaPrecos}
        handleInputTabela={handleInputTabela}
        gerarCombinacoes={gerarCombinacoes}
      />

      <div style={styles.sidebar}>
        {/* WIDGET DE LIMITES ATUALIZADO */}
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '11px', margin: '0 0 8px 0', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Uso do Plano: {planoLojista}</p>
          
          {/* Barra de Produtos */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              <span>📦 Produtos</span>
              <span>{produtos.length} / {limites.produtos}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((produtos.length / limites.produtos) * 100, 100)}%`, height: '100%', background: produtos.length >= limites.produtos ? '#ef4444' : '#10b981', transition: '0.3s' }} />
            </div>
          </div>

          {/* Barra de Categorias */}
          <div style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              <span>📁 Categorias</span>
              <span>{listaCategorias.length} / {limites.categorias}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((listaCategorias.length / limites.categorias) * 100, 100)}%`, height: '100%', background: listaCategorias.length >= limites.categorias ? '#ef4444' : '#3b82f6', transition: '0.3s' }} />
            </div>
          </div>
        </div>

        <h3 style={styles.sideTitle}>{editId ? "📝 Editar Produto" : "📦 Novo Produto"}</h3>
        <input style={styles.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Produto *" />
        
        <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
          <select style={{...styles.input, marginBottom:0, flex: 1}} value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="">Categoria... *</option>
            {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <button onClick={() => setShowCatManager(!showCatManager)} style={styles.btnActionSmall}>⚙️</button>
        </div>

        {showCatManager && (
          <div style={styles.catManager}>
            {listaCategorias.map(c => (
              <div key={c.id} style={styles.catItem}>
                <span style={{flex: 1}}>{c.nome}</span>
                <div style={{display:'flex', gap:'4px'}}>
                  <button onClick={() => {
                    const n = prompt("Novo nome:", c.nome); 
                    if(n && uid) updateDoc(doc(db,"lojistas",uid,"categorias",c.id),{nome:n});
                  }} style={styles.btnMini}>✏️</button>
                  <button onClick={() => {if(confirm("Excluir?") && uid) deleteDoc(doc(db,"lojistas",uid,"categorias",c.id))}} style={styles.btnMini}>❌</button>
                </div>
              </div>
            ))}
            <button onClick={async () => {
              if (listaCategorias.length >= limites.categorias) return alert("Limite de categorias atingido!");
              const n = prompt("Nome da nova categoria:"); 
              if(n && uid) await addDoc(collection(db,"lojistas",uid,"categorias"),{nome:n});
            }} style={styles.btnAddCat}>+ Adicionar</button>
          </div>
        )}

        <button onClick={() => setShowVarModal(true)} style={{...styles.btnUpload, border: '1px solid #ee4d2d', color: '#ee4d2d', fontWeight: 'bold', marginBottom: '10px'}}>
          {temVariaveisComPreco ? "⚙️ Editar Grade" : "➕ Adicionar Grade"}
        </button>

        <button onClick={() => setShowReqModal(true)} style={{...styles.btnUpload, border: '1px solid #d946ef', color: '#d946ef', fontWeight: 'bold', marginBottom: '10px'}}>
          🎯 Personalização ({Object.values(requisitos || {}).filter(Boolean).length})
        </button>

        <div style={styles.freteBox}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={precisaFrete} onChange={e => setPrecisaFrete(e.target.checked)} /> 
            <span>Produto Físico (Frete)</span>
          </label>
        </div>

        <textarea style={styles.textarea} value={descricao} onClick={() => setShowDescModal(true)} readOnly placeholder="Descrição... *" />

        {precisaFrete ? (
          <div style={styles.boxGray}>
            <label style={styles.miniLabel}>Medidas Melhor Envio *</label>
            <div style={styles.grid2}>
              <input style={styles.inputSmall} value={peso} onChange={e => formatInput(e.target.value, setPeso)} placeholder="Peso kg" />
              <input style={styles.inputSmall} value={comprimento} onChange={e => formatInput(e.target.value, setComprimento)} placeholder="Comp cm" />
              <input style={styles.inputSmall} value={largura} onChange={e => formatInput(e.target.value, setLargura)} placeholder="Larg cm" />
              <input style={styles.inputSmall} value={altura} onChange={e => formatInput(e.target.value, setAltura)} placeholder="Alt cm" />
            </div>
          </div>
        ) : (
          <div style={{...styles.boxGray, background: '#fef2f2', border: '1px solid #fee2e2'}}>
            <p style={{fontSize: '11px', color: '#b91c1c', margin: 0, fontWeight: 'bold', textAlign: 'center'}}>🚀 Kit Digital: Frete Ignorado</p>
          </div>
        )}

        <div style={{...styles.boxGray, opacity: temVariaveisComPreco ? 0.6 : 1}}>
          <label style={styles.miniLabel}>Valores R$</label>
          <div style={{display:'flex', gap:'5px'}}>
            <input disabled={temVariaveisComPreco} style={{...styles.input, marginBottom:0}} value={temVariaveisComPreco ? "Grade" : precoBasico} onChange={e => formatInput(e.target.value, setPrecoBasico)} placeholder="Venda" />
            <input disabled={temVariaveisComPreco} style={{...styles.input, marginBottom:0}} value={temVariaveisComPreco ? "Grade" : custoUnitario} onChange={e => formatInput(e.target.value, setCustoUnitario)} placeholder="Custo" />
          </div>
        </div>

        <div style={styles.previewGrid}>
          {imagens.map((img, i) => (
            <div key={i} style={{position:'relative'}}>
              <img src={img} style={styles.imgThumb} />
              <button onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} style={styles.btnDelImg}>×</button>
            </div>
          ))}
          {files.map((f, i) => (
             <img key={i} src={URL.createObjectURL(f)} style={{...styles.imgThumb, border:'2px solid #3b82f6'}} />
          ))}
        </div>

        <button style={styles.btnUpload}>
          <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} style={styles.fileInvis} />
          {uploading ? "Enviando..." : "📷 Fotos *"}
        </button>
        {files.length > 0 && <button onClick={uploadImagens} style={styles.btnConfirmImgs}>Confirmar Fotos</button>}

        <button onClick={salvar} style={styles.btnSave}>{loading ? "Aguarde..." : editId ? "Atualizar Produto" : "Salvar Produto"}</button>
        <button onClick={limparForm} style={styles.btnCancel}>{editId ? "✖ Cancelar" : "🧹 Limpar"}</button>
      </div>

      <div style={styles.main}>
        <div style={styles.topHeader}>
          <div style={styles.filterRow}>
            <input style={styles.searchBar} placeholder="🔍 Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
            <select style={styles.selectTop} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="Todos">Categorias</option>
              {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <select style={styles.selectStatus} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="Todos">Status</option>
              <option value="Visíveis">✅</option>
              <option value="Ocultos">🚫</option>
            </select>
            <button onClick={() => setModoMassa(!modoMassa)} style={{...styles.btnGeneric, background: modoMassa ? '#3b82f6' : '#fff', color: modoMassa ? '#fff' : '#3b82f6'}}>Massa</button>
            
            {/* BOTÃO DE EXPORTAÇÃO */}
            <button 
              onClick={exportarProdutosCSV} 
              style={{...styles.btnGeneric, background: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '5px'}}
            >
              <FiDownload /> Exportar
            </button>
          </div>
          
          {modoMassa && (
            <div style={styles.massPanel}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <button onClick={() => setSelecionados(selecionados.length === produtosFiltrados.length ? [] : produtosFiltrados.map(p => p.id))} style={{...styles.btnMass, borderColor: '#cbd5e1'}}>
                  {selecionados.length === produtosFiltrados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
                <span style={{fontSize:'12px', fontWeight:'bold', color: '#1e40af'}}>{selecionados.length} itens selecionados</span>
              </div>
              <div style={{display:'flex', gap:'5px'}}>
                <button onClick={() => acaoEmMassa('mostrar')} style={{...styles.btnMass, color: '#059669'}}>👁️ Mostrar</button>
                <button onClick={() => acaoEmMassa('ocultar')} style={{...styles.btnMass, color: '#64748b'}}>🚫 Ocultar</button>
                <button onClick={() => acaoEmMassa('preco')} style={{...styles.btnMass, color: '#3b82f6'}}>💰 Preço</button>
                <button onClick={() => acaoEmMassa('excluir')} style={{...styles.btnMass, color:'#ef4444', borderColor: '#fecaca'}}>🗑️ Excluir</button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.productGrid}>
          {produtosFiltrados.map(p => {
            const lucro = calcularLucro(p.precoBasico, p.custoUnitario);
            return (
              <div key={p.id} style={{...styles.card, opacity: p.ativo ? 1 : 0.6}}>
                {p.destaque && <span style={styles.starBadge}>⭐</span>}
                {modoMassa && <input type="checkbox" style={styles.cardCheck} checked={selecionados.includes(p.id)} onChange={e => e.target.checked ? setSelecionados([...selecionados, p.id]) : setSelecionados(selecionados.filter(id => id !== p.id))} />}
                <img src={p.capa} style={styles.cardImg} alt={p.nome} />

                <div style={styles.cardBody}>
                  <h4 style={styles.cardTitle}>{p.nome}</h4>
                  <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px'}}>
                    <span style={styles.cardPrice}>R$ {p.precoBasico}</span>
                    {lucro && <span style={styles.markupTag}>+{lucro}%</span>}
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => uid && updateDoc(doc(db,"lojistas",uid,"produtos",p.id), {destaque: !p.destaque})} style={styles.btnSlim}>{p.destaque ? "⭐ Destacado" : "☆ Destacar"}</button>
                    <button onClick={() => {
                      setEditId(p.id); setNome(p.nome); setCategoria(p.categoria || ""); setPrecoBasico(p.precoBasico || ""); 
                      setCustoUnitario(p.custoUnitario || ""); setImagens(p.imagens || []); setDescricao(p.descricao || "");
                      setPrecisaFrete(p.precisaFrete ?? true); setPeso(p.peso || ""); setComprimento(p.comprimento || "");
                      setLargura(p.largura || ""); setAltura(p.altura || "");
                      setRequisitos(p.requisitos || { pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });

                      if (p.variacoes) {
                        setNomeVar1(p.nomeVar1 || "Cor"); setNomeVar2(p.nomeVar2 || "");
                        const tab: any = {}; 
                        p.variacoes.forEach((v: any) => { 
                          const key = v.v2 ? `${v.v1}-${v.v2}` : v.v1;
                          tab[key] = { preco: v.preco, custo: v.custo, foto: v.foto || "" };
                        });
                        setTabelaPrecos(tab);
                        setOpcoesVar1([...new Set(p.variacoes.map((v:any) => v.v1))] as string[]);
                        setOpcoesVar2([...new Set(p.variacoes.map((v:any) => v.v2).filter((v:any) => v))] as string[]);
                      }
                    }} style={styles.btnSlim}>✏️ Editar</button>
                    <button onClick={() => uid && updateDoc(doc(db,"lojistas",uid,"produtos",p.id), {ativo: !p.ativo})} style={styles.btnSlim}>{p.ativo ? "🚫 Ocultar" : "👁️ Mostrar"}</button>
                    <button onClick={() => {if(confirm("Excluir?") && uid) deleteDoc(doc(db,"lojistas",uid,"produtos",p.id))}} style={styles.btnDelete}>🗑️ Excluir</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}