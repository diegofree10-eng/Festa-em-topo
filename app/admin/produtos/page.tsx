"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase"; 
import { 
  collection, 
  addDoc, 
  doc, 
  query, 
  orderBy, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  setDoc 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  uploadString 
} from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const PALAVRAS_PROIBIDAS = [
  "admin", "master", "suporte", "festaemtopo", "root", "null", 
  "undefined", "api", "vendas", "financeiro", "ajuda", "config",
  "sistema", "login", "auth", "teste", "gerente", "houseconviteria",
  "chefe", "teste", "gerente"
];

const styles: { [key: string]: React.CSSProperties } = {
  page: { display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '20px', borderRadius: '12px', width: '80%', maxWidth: '600px', height: '70vh', display: 'flex', flexDirection: 'column' },
  modalTextarea: { flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'none', lineHeight: '1.5' },
  sidebar: { width: '260px', minWidth: '260px', maxWidth: '260px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box' },
  main: { flex: 1, padding: '15px', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' },
  topHeader: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', width: '100%', boxSizing: 'border-box' },
  filterRow: { display: 'flex', gap: '5px', alignItems: 'center', width: '100%', boxSizing: 'border-box' },
  searchBar: { flex: 3, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' },
  selectTop: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px' },
  selectStatus: { width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' },
  btnGeneric: { padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  massPanel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px solid #3b82f6' },
  btnMass: { padding: '6px 12px', background: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '10px', width: '100%' },
  card: { background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '260px' },
  starBadge: { position: 'absolute', top: '5px', right: '5px', zIndex: 5, fontSize: '14px' },
  cardCheck: { position: 'absolute', top: '8px', left: '8px', zIndex: 10, width: '18px', height: '18px' },
  cardImg: { width: '100%', height: '100px', minHeight: '100px', maxHeight: '100px', objectFit: 'contain', background: '#ffffff', padding: '4px', display: 'block', borderBottom: '1px solid #f1f5f9', boxSizing: 'border-box' },
  cardBody: { padding: '8px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-start', gap: '2px' },
  cardTitle: { fontSize: '10px', fontWeight: 'bold', height: '24px', color: '#334155', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '12px', marginBottom: '4px' },
  cardPrice: { fontSize: '13px', fontWeight: 'bold', color: '#10b981', marginTop: 'auto' },
  markupTag: { fontSize: '9px', background: '#ecfdf5', color: '#059669', padding: '1px 4px', borderRadius: '4px', fontWeight: '800', alignSelf: 'flex-start' },
  cardActions: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', padding: '0 8px 8px 8px' },
  btnSlim: { padding: '4px', fontSize: '9px', fontWeight: 'bold', border: 'none', borderRadius: '3px', background: '#f1f5f9', cursor: 'pointer', textAlign: 'center' },
  btnDelete: { padding: '4px', fontSize: '9px', fontWeight: 'bold', border: 'none', borderRadius: '3px', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', textAlign: 'center' },
  sideTitle: { fontSize: '15px', fontWeight: 'bold', marginBottom: '15px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', resize: 'none', overflow: 'hidden' },
  freteBox: { padding: '10px', background: '#eff6ff', borderRadius: '8px', marginBottom: '10px', border: '1px solid #dbeafe' },
  checkLabel: { fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  boxGray: { background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '10px' },
  miniLabel: { fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' },
  inputSmall: { width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  btnSave: { width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  btnCancel: { width: '100%', marginTop: '5px', padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  btnUpload: { width: '100%', padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px', position: 'relative', fontSize: '12px' },
  btnConfirmImgs: { width: '100%', padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', marginBottom: '10px', cursor: 'pointer' },
  fileInvis: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' },
  imgThumb: { width: '100%', height: '40px', objectFit: 'cover', borderRadius: '4px' },
  btnDelImg: { position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px' },
  catManager: { background: '#f8fafc', padding: '8px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0' },
  catItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', alignItems: 'center' },
  btnAddCat: { width: '100%', padding: '5px', fontSize: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' },
  btnActionSmall: { padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  btnMini: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '10px' }
};

const shopeeStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', width: '95%', maxWidth: '800px', height: '90vh', borderRadius: '4px', display: 'flex', flexDirection: 'column' },
  header: { padding: '15px 20px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '18px', margin: 0, color: '#333333' },
  closeBtn: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#f50c0c' },
  content: { flex: 1, overflowY: 'auto', padding: '20px' },
  section: { marginBottom: '25px' },
  label: { display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#494646' },
  varBox: { border: '1px solid #e8e8e8', padding: '15px', borderRadius: '2px', background: '#fafafa' },
  tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' },
  tagInputWrapper: { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #dcdcdc', borderRadius: '2px' },
  tagInput: { border: 'none', padding: '6px 10px', outline: 'none', width: '100px', fontSize: '13px' },
  delTag: { border: 'none', background: 'none', padding: '0 8px', cursor: 'pointer', color: '#999', borderLeft: '1px solid #eee' },
  addBtn: { border: '1px dashed #ee4d2d', background: '#fff', color: '#ee4d2d', padding: '6px 15px', cursor: 'pointer', borderRadius: '2px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  trHead: { background: '#f6f6f6' },
  th: { padding: '12px', textAlign: 'left', fontSize: '13px', border: '1px solid #e8e8e8' },
  tr: { border: '1px solid #e8e8e8' },
  td: { padding: '10px', border: '1px solid #e8e8e8' },
  tableInput: { width: '100%', padding: '8px', border: '1px solid #dcdcdc', borderRadius: '2px', outline: 'none', textAlign: 'right' },
  footer: { padding: '15px 20px', borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'flex-end' }
};

export default function CadastroProdutos() {
  const [uid, setUid] = useState<string | null>(null);
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

  useEffect(() => {
    let unsubProdutos: (() => void) | null = null;
    let unsubCategorias: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        unsubProdutos = onSnapshot(query(collection(db, "lojistas", user.uid, "produtos"), orderBy("createdAt", "desc")), (snap) => { 
          setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        });
        unsubCategorias = onSnapshot(query(collection(db, "lojistas", user.uid, "categorias"), orderBy("nome", "asc")), (snap) => { 
          setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        });
      } else {
        if (unsubProdutos) unsubProdutos(); if (unsubCategorias) unsubCategorias();
        setUid(null); setProdutos([]); setListaCategorias([]);
      }
    });
    return () => { unsubAuth(); if (unsubProdutos) unsubProdutos(); if (unsubCategorias) unsubCategorias(); };
  }, []);

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

  async function uploadImagens() {
    if (!uid || imagens.length + files.length > 4) return alert("Máximo 4 fotos.");
    setUploading(true);
    const urls: string[] = [];
    for (let file of files) {
      try {
        const blob = await comprimirImagem(file);
        const storageRef = ref(storage, `lojistas/${uid}/produtos/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        urls.push(downloadURL);
      } catch (e) { console.error(e); }
    }
    setImagens([...imagens, ...urls]); setFiles([]); setUploading(false);
  }

  const gerarCombinacoes = () => {
    if (opcoesVar1.length === 0) return [];
    if (opcoesVar2.length === 0) return opcoesVar1.filter(v => v.trim()).map(v1 => ({ v1, v2: "", key: v1 }));
    const combos: any[] = [];
    opcoesVar1.filter(v => v.trim()).forEach(v1 => {
      opcoesVar2.filter(v => v.trim()).forEach(v2 => { combos.push({ v1, v2, key: `${v1}-${v2}` }); });
    });
    return combos;
  };

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
    if (!validarTexto(nome) || !nome.trim()) return alert("Nome inválido.");
    if (!categoria) return alert("Selecione uma categoria.");
    if (imagens.length === 0) return alert("Adicione uma foto.");

    setLoading(true);
    try {
      const produtoId = editId || doc(collection(db, "lojistas", uid, "produtos")).id;
      const novaTabelaPrecos = { ...tabelaPrecos };
      
      // Corrigido: Loop de upload das fotos das variações que agora aguarda a conclusão
      const keys = Object.keys(tabelaPrecos);
      for (const key of keys) {
        const item = tabelaPrecos[key];
        if (item.foto && item.foto.startsWith("data:image")) {
          const storageRef = ref(storage, `lojistas/${uid}/produtos/${produtoId}/vars/${key}.jpg`);
          const snapshot = await uploadString(storageRef, item.foto, 'data_url');
          const downloadURL = await getDownloadURL(snapshot.ref);
          novaTabelaPrecos[key].foto = downloadURL;
        }
      }

      const combos = gerarCombinacoes();
      const precosValidos = Object.values(novaTabelaPrecos).map((v: any) => parseFloat(v.preco)).filter(p => p > 0);
      const precoFinal = precosValidos.length > 0 ? Math.min(...precosValidos).toFixed(2) : precoBasico;

      const dados: any = {
        lojistaId: uid, nome, descricao, categoria, precoBasico: precoFinal, custoUnitario, ativo, precisaFrete,
        peso, comprimento, largura, altura, imagens, capa: imagens[0] || "",
        temVariacoes: temVariaveisComPreco,
        nomeVar1, nomeVar2,
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
      if (editId) {
        await updateDoc(docRef, dados);
      } else {
        await setDoc(docRef, { ...dados, destaque: false, createdAt: Date.now() });
      }
      
      alert("Sucesso!");
      limparForm();
    } catch (e) { 
      console.error(e);
      alert("Erro ao salvar."); 
    }
    setLoading(false);
  }

  const limparForm = () => {
    setNome(""); setDescricao(""); setCategoria(""); setPrecoBasico(""); setCustoUnitario("");
    setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]); setPrecisaFrete(true);
    setOpcoesVar1(["Azul", "Rosa"]); setOpcoesVar2([]); setNomeVar1("Cor"); setNomeVar2(""); setTabelaPrecos({});
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
      
      {showVarModal && (
        <div style={shopeeStyles.overlay}>
          <div style={shopeeStyles.modal}>
            <div style={shopeeStyles.header}>
              <h3 style={shopeeStyles.title}>Grade de Variações</h3>
              <button onClick={() => setShowVarModal(false)} style={shopeeStyles.closeBtn}>✕</button>
            </div>

            <div style={shopeeStyles.content}>
              <div style={shopeeStyles.section}>
                <label style={shopeeStyles.label}>Variação 1 (ex: Modelo)</label>
                <div style={shopeeStyles.varBox}>
                  <input style={styles.input} value={nomeVar1} onChange={e => setNomeVar1(e.target.value)} placeholder="Ex: Modelo" />
                  <div style={shopeeStyles.tagsContainer}>
                    {opcoesVar1.map((op, idx) => (
                      <div key={idx} style={shopeeStyles.tagInputWrapper}>
                        <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar1]; n[idx] = e.target.value; setOpcoesVar1(n); }} />
                        <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar1(opcoesVar1.filter((_, i) => i !== idx))}>✕</button>
                      </div>
                    ))}
                    <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar1([...opcoesVar1, ""])}>+ Adicionar</button>
                  </div>
                </div>
              </div>

              <div style={shopeeStyles.section}>
                <label style={shopeeStyles.label}>Variação 2 (ex: Quantidade)</label>
                <div style={shopeeStyles.varBox}>
                  <input style={styles.input} value={nomeVar2} onChange={e => setNomeVar2(e.target.value)} placeholder="Ex: Quantidade" />
                  <div style={shopeeStyles.tagsContainer}>
                    {opcoesVar2.map((op, idx) => (
                      <div key={idx} style={shopeeStyles.tagInputWrapper}>
                        <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar2]; n[idx] = e.target.value; setOpcoesVar2(n); }} />
                        <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar2(opcoesVar2.filter((_, i) => i !== idx))}>✕</button>
                      </div>
                    ))}
                    <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar2([...opcoesVar2, ""])}>+ Adicionar</button>
                  </div>
                </div>
              </div>

              <table style={{ ...shopeeStyles.table, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={shopeeStyles.trHead}>
                    <th style={{ ...shopeeStyles.th, width: '120px' }}>{nomeVar1 || "Variação 1"}</th>
                    <th style={shopeeStyles.th}>{nomeVar2 || "Variação 2"}</th>
                    <th style={shopeeStyles.th}>Preço (R$)</th>
                    <th style={shopeeStyles.th}>Custo (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {opcoesVar1.map((v1) => {
                    const combsDesteGrupo = gerarCombinacoes().filter(c => c.v1 === v1);
                    return combsDesteGrupo.map((c, idx) => (
                      <tr key={c.key} style={{ ...shopeeStyles.tr, borderBottom: '1px solid #e2e8f0' }}>
                        {idx === 0 && (
                          <td rowSpan={combsDesteGrupo.length} style={{ ...shopeeStyles.td, textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{v1}</div>
                            <div style={{ width: '60px', height: '60px', margin: '0 auto', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', background: '#fff', overflow: 'hidden' }}>
                              {tabelaPrecos[c.key]?.foto ? (
                                <img src={tabelaPrecos[c.key].foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ color: '#ee4d2d', fontSize: '20px' }}>+</span>
                              )}
                              <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const img = new Image();
                                    img.src = event.target?.result as string;
                                    img.onload = () => {
                                      const canvas = document.createElement('canvas');
                                      const MAX = 600;
                                      let w = img.width, h = img.height;
                                      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                                      else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                                      canvas.width = w; canvas.height = h;
                                      const ctx = canvas.getContext('2d');
                                      ctx?.drawImage(img, 0, 0, w, h);
                                      const compressed = canvas.toDataURL('image/jpeg', 0.7);
                                      combsDesteGrupo.forEach(comb => handleInputTabela(comb.key, "foto", compressed));
                                    };
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </div>
                          </td>
                        )}
                        <td style={{ ...shopeeStyles.td, textAlign: 'center' }}>{c.v2 || "-"}</td>
                        <td style={shopeeStyles.td}>
                          <input style={shopeeStyles.tableInput} value={tabelaPrecos[c.key]?.preco || ""} onChange={e => handleInputTabela(c.key, "preco", e.target.value)} placeholder="0,00" />
                        </td>
                        <td style={shopeeStyles.td}>
                          <input style={shopeeStyles.tableInput} value={tabelaPrecos[c.key]?.custo || ""} onChange={e => handleInputTabela(c.key, "custo", e.target.value)} placeholder="0,00" />
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
            <div style={shopeeStyles.footer}>
              <button style={{ backgroundColor: '#ee4d2d', color: '#fff', border: 'none', padding: '10px 40px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }} onClick={() => setShowVarModal(false)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.sidebar}>
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
            <button onClick={() => {
              const n = prompt("Nome da nova categoria:"); 
              if(n && uid) addDoc(collection(db,"lojistas",uid,"categorias"),{nome:n});
            }} style={styles.btnAddCat}>+ Adicionar</button>
          </div>
        )}

        <button onClick={() => setShowVarModal(true)} style={{...styles.btnUpload, border: '1px solid #ee4d2d', color: '#ee4d2d', fontWeight: 'bold', marginBottom: '10px'}}>
          {temVariaveisComPreco ? "⚙️ Editar Grade" : "➕ Adicionar Grade"}
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
        
        {editId ? (
          <button onClick={limparForm} style={styles.btnCancel}>✖ Cancelar Edição</button>
        ) : (
          <button onClick={limparForm} style={styles.btnCancel}>🧹 Limpar</button>
        )}
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
          </div>
          
          {modoMassa && (
            <div style={styles.massPanel}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <button 
                  onClick={() => setSelecionados(selecionados.length === produtosFiltrados.length ? [] : produtosFiltrados.map(p => p.id))}
                  style={{...styles.btnMass, borderColor: '#cbd5e1'}}
                >
                  {selecionados.length === produtosFiltrados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
                <span style={{fontSize:'12px', fontWeight:'bold', color: '#1e40af'}}>
                  {selecionados.length} itens selecionados
                </span>
              </div>
              
              <div style={{display:'flex', gap:'5px'}}>
                <button onClick={() => acaoEmMassa('mostrar')} style={{...styles.btnMass, color: '#059669'}}>👁️ Mostrar</button>
                <button onClick={() => acaoEmMassa('ocultar')} style={{...styles.btnMass, color: '#64748b'}}>🚫 Ocultar</button>
                <button onClick={() => acaoEmMassa('preco')} style={{...styles.btnMass, color: '#3b82f6'}}>💰 Alterar Preço</button>
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
                <img src={p.capa} style={styles.cardImg} />

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