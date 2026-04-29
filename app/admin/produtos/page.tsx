"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase"; 
import {
  collection, addDoc, doc, query, orderBy, 
  updateDoc, deleteDoc, onSnapshot, writeBatch
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const PALAVRAS_PROIBIDAS = [
  "admin", "master", "suporte", "festaemtopo", "root", "null", 
  "undefined", "api", "vendas", "financeiro", "ajuda", "config",
  "sistema", "login", "auth", "teste", "gerente"
];

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
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [modoMassa, setModoMassa] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // ESTADOS DO POP-UP SHOPEE
  const [showVarModal, setShowVarModal] = useState(false);
  const [nomeVariacao, setNomeVariacao] = useState("Cor");
  const [opcoes, setOpcoes] = useState(["Azul", "Rosa"]);
  const [tabelaPrecos, setTabelaPrecos] = useState<any>({});

  // --- FUNÇÃO DE VALIDAÇÃO ---
  const validarTexto = (texto: string) => {
    const t = texto.toLowerCase();
    return !PALAVRAS_PROIBIDAS.some(p => t.includes(p));
  };

  const temVariaveisComPreco = Object.values(tabelaPrecos).some((v: any) => {
    return v?.preco && v.preco.toString().trim() !== "" && parseFloat(v.preco) > 0;
  });

  useEffect(() => {
    let unsubProdutos: (() => void) | null = null;
    let unsubCategorias: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        unsubProdutos = onSnapshot(
          query(collection(db, "lojistas", user.uid, "produtos"), orderBy("createdAt", "desc")), 
          (snap) => { setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
          (error) => { if (error.code === "permission-denied") return; console.error("Erro Produtos:", error); }
        );

        unsubCategorias = onSnapshot(
          query(collection(db, "lojistas", user.uid, "categorias"), orderBy("nome", "asc")), 
          (snap) => { setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
          (error) => { if (error.code === "permission-denied") return; console.error("Erro Categorias:", error); }
        );
      } else {
        if (unsubProdutos) unsubProdutos();
        if (unsubCategorias) unsubCategorias();
        setUid(null);
        setProdutos([]);
        setListaCategorias([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProdutos) unsubProdutos();
      if (unsubCategorias) unsubCategorias();
    };
  }, []);

  const formatInput = (value: string, setter: (v: string) => void) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) { setter(""); return; }
    const amount = (parseInt(cleanValue) / 100).toFixed(2);
    setter(amount);
  };

  const calcularLucro = (venda: string, custo: string) => {
    const v = parseFloat(venda); 
    const c = parseFloat(custo);
    if (!v || !c || c === 0) return null;
    return (((v - c) / c) * 100).toFixed(0);
  };

  const adicionarOpcao = () => setOpcoes([...opcoes, ""]);
  const atualizarOpcao = (index: number, valor: string) => {
    const novas = [...opcoes];
    novas[index] = valor;
    setOpcoes(novas);
  };
  const handleInputTabela = (opcao: string, campo: string, valor: string) => {
    const cleanValue = valor.replace(/\D/g, "");
    const formatted = cleanValue ? (parseInt(cleanValue) / 100).toFixed(2) : "";
    setTabelaPrecos((prev: any) => ({
      ...prev,
      [opcao]: { ...prev[opcao], [campo]: formatted }
    }));
  };

  async function uploadImagens() {
    if (imagens.length + files.length > 4) return alert("Máximo 4 fotos.");
    setUploading(true);
    const urls: string[] = [];
    for (let file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "eep2qiix");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dbzydexo2/image/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) urls.push(data.secure_url);
      } catch (e) { console.error(e); }
    }
    setImagens([...imagens, ...urls]); 
    setFiles([]); 
    setUploading(false);
  }

  async function acaoEmMassa(tipo: string) {
    if (selecionados.length === 0 || !uid) return;
    const batch = writeBatch(db);
    if (tipo === 'excluir' && !confirm("Excluir selecionados?")) return;

    for (const id of selecionados) {
      const ref = doc(db, "lojistas", uid, "produtos", id);
      if (tipo === 'ocultar') batch.update(ref, { ativo: false });
      if (tipo === 'mostrar') batch.update(ref, { ativo: true });
      if (tipo === 'excluir') batch.delete(ref);
      if (tipo === 'preco') {
        const novoPrecoStr = prompt("Novo preço (ex: 1200 para R$ 12.00):");
        if (novoPrecoStr) {
           const valor = (parseInt(novoPrecoStr.replace(/\D/g, "")) / 100).toFixed(2);
           batch.update(ref, { precoBasico: valor });
        }
      }
    }
    await batch.commit();
    setSelecionados([]);
    setModoMassa(false);
  }

  async function salvar() {
    if (!uid) return;

    // --- VALIDAÇÃO DE PALAVRAS PROIBIDAS ---
    if (!validarTexto(nome)) return alert("O nome do produto contém palavras não permitidas.");

    // --- VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ---
    if (!nome.trim()) return alert("O nome do produto é obrigatório.");
    if (!categoria) return alert("Selecione uma categoria.");
    if (!descricao.trim()) return alert("A descrição é obrigatória.");
    if (imagens.length === 0) return alert("Adicione pelo menos uma imagem.");
    
    if (precisaFrete) {
        if (!peso || !comprimento || !largura || !altura) {
            return alert("Para produtos físicos, as medidas e peso são obrigatórios.");
        }
    }

    if (!temVariaveisComPreco) {
        if (!precoBasico || parseFloat(precoBasico) <= 0) return alert("Defina o preço de venda.");
        if (!custoUnitario || parseFloat(custoUnitario) <= 0) return alert("Defina o custo unitário.");
    }

    setLoading(true);

    let precoFinalParaSalvar = precoBasico;
    let custoFinalParaSalvar = custoUnitario;

    if (temVariaveisComPreco) {
      const precos = Object.values(tabelaPrecos).map((v: any) => parseFloat(v.preco)).filter(p => !isNaN(p) && p > 0);
      const custos = Object.values(tabelaPrecos).map((v: any) => parseFloat(v.custo)).filter(c => !isNaN(c) && c > 0);
      
      if (precos.length > 0) precoFinalParaSalvar = Math.min(...precos).toFixed(2);
      if (custos.length > 0) custoFinalParaSalvar = Math.min(...custos).toFixed(2);
    }

    const dados = {
      nome, 
      descricao, 
      categoria, 
      precoBasico: precoFinalParaSalvar, 
      custoUnitario: custoFinalParaSalvar, 
      ativo, 
      precisaFrete,
      peso: precisaFrete ? peso : "0.00",
      comprimento: precisaFrete ? comprimento : "0.00",
      largura: precisaFrete ? largura : "0.00",
      altura: precisaFrete ? altura : "0.00",
      imagens, 
      capa: imagens[0] || "", 
      temVariacoes: temVariaveisComPreco,
      variacoes: temVariaveisComPreco ? opcoes.map(op => ({
        nome: op,
        preco: tabelaPrecos[op]?.preco || precoBasico,
        custo: tabelaPrecos[op]?.custo || custoUnitario
      })) : [],
      nomeVariacaoPrincipal: nomeVariacao,
      updatedAt: Date.now()
    };

    try {
      if (editId) await updateDoc(doc(db, "lojistas", uid, "produtos", editId), dados);
      else await addDoc(collection(db, "lojistas", uid, "produtos"), { ...dados, destaque: false, createdAt: Date.now() });
      limparForm();
      alert("Produto salvo com sucesso!");
    } catch (e) { alert("Erro ao salvar."); }
    setLoading(false);
  }

  const limparForm = () => {
    setNome(""); setDescricao(""); setCategoria(""); setPrecoBasico(""); setCustoUnitario("");
    setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]); setPrecisaFrete(true);
    setOpcoes(["Azul", "Rosa"]); setNomeVariacao("Cor"); setTabelaPrecos({});
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
              <h3 style={shopeeStyles.title}>Informações de Vendas</h3>
              <button onClick={() => setShowVarModal(false)} style={shopeeStyles.closeBtn}>✕</button>
            </div>
            <div style={shopeeStyles.content}>
              <div style={shopeeStyles.section}>
                <label style={shopeeStyles.label}>Variação 1</label>
                <div style={shopeeStyles.varBox}>
                  <div style={shopeeStyles.inputGroup}>
                    <span>Nome:</span>
                    <input style={shopeeStyles.input} value={nomeVariacao} onChange={(e) => setNomeVariacao(e.target.value)} placeholder="Ex: Cor" />
                  </div>
                  <div style={shopeeStyles.optionsGrid}>
                    <span>Opções:</span>
                    <div style={shopeeStyles.tagsContainer}>
                      {opcoes.map((op, idx) => (
                        <div key={idx} style={shopeeStyles.tagInputWrapper}>
                          <input style={shopeeStyles.tagInput} value={op} onChange={(e) => atualizarOpcao(idx, e.target.value)} />
                          <button style={shopeeStyles.delTag} onClick={() => setOpcoes(opcoes.filter((_, i) => i !== idx))}>✕</button>
                        </div>
                      ))}
                      <button style={shopeeStyles.addBtn} onClick={adicionarOpcao}>+ Adicionar Opção</button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={shopeeStyles.section}>
                <table style={shopeeStyles.table}>
                  <thead>
                    <tr style={shopeeStyles.trHead}>
                      <th style={shopeeStyles.th}>{nomeVariacao || "Variação"}</th>
                      <th style={shopeeStyles.th}>Preço (R$)</th>
                      <th style={shopeeStyles.th}>Custo (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opcoes.map((op, idx) => (
                      <tr key={idx} style={shopeeStyles.tr}>
                        <td style={shopeeStyles.td}>{op || "—"}</td>
                        <td style={shopeeStyles.td}><input style={shopeeStyles.tableInput} value={tabelaPrecos[op]?.preco || ""} onChange={(e) => handleInputTabela(op, "preco", e.target.value)} placeholder="0,00" /></td>
                        <td style={shopeeStyles.td}><input style={shopeeStyles.tableInput} value={tabelaPrecos[op]?.custo || ""} onChange={(e) => handleInputTabela(op, "custo", e.target.value)} placeholder="0,00" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={shopeeStyles.footer}>
              <button style={shopeeStyles.btnCancel} onClick={() => setShowVarModal(false)}>Cancelar</button>
              <button style={shopeeStyles.btnConfirm} onClick={() => setShowVarModal(false)}>Confirmar</button>
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
                <span>{c.nome}</span>
                <div style={{display:'flex', gap:'4px'}}>
                  <button onClick={() => {
                    const n = prompt("Novo nome:", c.nome); 
                    if(n && uid) {
                      if(!validarTexto(n)) return alert("Nome de categoria não permitido.");
                      updateDoc(doc(db,"lojistas",uid,"categorias",c.id),{nome:n});
                    }
                  }} style={styles.btnMini}>✏️</button>
                  <button onClick={() => {if(confirm("Deseja excluir a categoria?") && uid) deleteDoc(doc(db,"lojistas",uid,"categorias",c.id))}} style={styles.btnMini}>❌</button>
                </div>
              </div>
            ))}
            <button onClick={() => {
              const n = prompt("Nome da nova categoria:"); 
              if(n && uid) {
                if(!validarTexto(n)) return alert("Nome de categoria não permitido.");
                addDoc(collection(db,"lojistas",uid,"categorias"),{nome:n});
              }
            }} style={styles.btnAddCat}>+ Adicionar</button>
          </div>
        )}

        <button onClick={() => setShowVarModal(true)} style={{...styles.btnUpload, border: '1px solid #ee4d2d', color: '#ee4d2d', fontWeight: 'bold', marginBottom: '10px'}}>
          {temVariaveisComPreco ? "⚙️ Editar Variações" : "➕ Adicionar Variações"}
        </button>

        <div style={styles.freteBox}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={precisaFrete} onChange={e => setPrecisaFrete(e.target.checked)} /> 
            <span>Produto Físico (Frete)</span>
          </label>
        </div>

        <textarea style={{...styles.textarea, cursor: 'pointer', border: !descricao.trim() ? '1px solid #fda4af' : '1px solid #e2e8f0'}} value={descricao} onClick={() => setShowDescModal(true)} readOnly placeholder="Descrição obrigatória... *" />

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
          <label style={styles.miniLabel}>Valores R$ {temVariaveisComPreco ? "" : "*"}</label>
          <div style={{display:'flex', gap:'5px'}}>
            <input disabled={temVariaveisComPreco} style={{...styles.input, marginBottom:0, background: temVariaveisComPreco ? '#e2e8f0' : '#fff'}} value={temVariaveisComPreco ? "Variações" : precoBasico} onChange={e => formatInput(e.target.value, setPrecoBasico)} placeholder="Venda" />
            <input disabled={temVariaveisComPreco} style={{...styles.input, marginBottom:0, background: temVariaveisComPreco ? '#e2e8f0' : '#fff'}} value={temVariaveisComPreco ? "Variações" : custoUnitario} onChange={e => formatInput(e.target.value, setCustoUnitario)} placeholder="Custo" />
          </div>
        </div>

        <div style={styles.previewGrid}>
          {imagens.map((img, i) => (
            <div key={'old'+i} style={{position:'relative'}}>
              {img && <img src={img} style={styles.imgThumb} alt="salva" />}
              <button onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} style={styles.btnDelImg}>×</button>
            </div>
          ))}
          {files.map((f, i) => (
             <img key={'new'+i} src={URL.createObjectURL(f)} style={{...styles.imgThumb, border:'2px solid #3b82f6'}} alt="preview" />
          ))}
        </div>

        <button style={{...styles.btnUpload, borderColor: imagens.length === 0 ? '#fda4af' : '#cbd5e1'}}>
          <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} style={styles.fileInvis} />
          {uploading ? "Enviando..." : "📷 Escolher Fotos (Mín 1) *"}
        </button>
        {files.length > 0 && !uploading && <button onClick={uploadImagens} style={styles.btnConfirmImgs}>Confirmar {files.length} fotos</button>}

        <button onClick={salvar} style={styles.btnSave}>{loading ? "Aguarde..." : (editId ? "Atualizar" : "Salvar Produto")}</button>
        <button onClick={limparForm} style={styles.btnCancel}>Cancelar / Limpar</button>
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
            <button onClick={() => {setModoMassa(!modoMassa); setSelecionados([]);}} style={{...styles.btnGeneric, background: modoMassa ? '#3b82f6' : '#fff', color: modoMassa ? '#fff' : '#3b82f6'}}>{modoMassa ? "Sair" : "Massa"}</button>
          </div>
          {modoMassa && (
            <div style={styles.massPanel}>
              <span style={{fontSize:'12px', fontWeight:'bold'}}>{selecionados.length} selecionados</span>
              <div style={{display:'flex', gap:'5px'}}>
                <button onClick={() => acaoEmMassa('mostrar')} style={styles.btnMass}>👁️ Mostrar</button>
                <button onClick={() => acaoEmMassa('ocultar')} style={styles.btnMass}>🚫 Ocultar</button>
                <button onClick={() => acaoEmMassa('preco')} style={styles.btnMass}>💰 Preço</button>
                <button onClick={() => acaoEmMassa('excluir')} style={{...styles.btnMass, color:'red'}}>🗑️ Excluir</button>
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
                {p.capa ? <img src={p.capa} style={styles.cardImg} alt="capa" /> : <div style={{...styles.cardImg, background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#94a3b8'}}>Sem Foto</div>}

                <div style={styles.cardBody}>
                  <h4 style={styles.cardTitle}>{p.nome}</h4>
                  <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px'}}>
                    <span style={styles.cardPrice}>R$ {p.precoBasico}</span>
                    {lucro && <span style={styles.markupTag}>+{lucro}%</span>}
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => uid && updateDoc(doc(db,"lojistas",uid,"produtos",p.id), {destaque: !p.destaque})} style={styles.btnSlim}>{p.destaque ? "⭐ Destacado" : "☆ Destacar"}</button>
                    <button onClick={() => {
                      setEditId(p.id); setNome(p.nome); setCategoria(p.categoria || ""); setPrecoBasico(p.precoBasico || ""); setCustoUnitario(p.custoUnitario || ""); setImagens(p.imagens || []); 
                      setPrecisaFrete(p.precisaFrete ?? true); setDescricao(p.descricao || ""); setPeso(p.peso || ""); setComprimento(p.comprimento || ""); setLargura(p.largura || ""); setAltura(p.altura || "");
                      setOpcoes(p.variacoes?.length > 0 ? p.variacoes.map((v:any) => v.nome) : ["Azul", "Rosa"]); setNomeVariacao(p.nomeVariacaoPrincipal || "Cor");
                      const tab: any = {}; p.variacoes?.forEach((v: any) => { tab[v.nome] = { preco: v.preco, custo: v.custo }; });
                      setTabelaPrecos(tab);
                    }} style={styles.btnSlim}>✏️ Editar</button>
                    <button onClick={() => uid && updateDoc(doc(db,"lojistas",uid,"produtos",p.id), {ativo: !p.ativo})} style={styles.btnSlim}>{p.ativo ? "🚫 Ocultar" : "👁️ Mostrar"}</button>
                    <button onClick={() => {if(confirm("Excluir?") && uid) deleteDoc(doc(db,"lojistas",uid,"produtos",p.id))}} style={{...styles.btnSlim, color:'#ef4444'}}>🗑️ Excluir</button>
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

// OS STYLES CONTINUAM EXATAMENTE IGUAIS AO SEU CÓDIGO ORIGINAL...
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
  card: { background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' },
  starBadge: { position: 'absolute', top: '5px', right: '5px', zIndex: 5, fontSize: '14px' },
  cardCheck: { position: 'absolute', top: '8px', left: '8px', zIndex: 10, width: '18px', height: '18px' },
  cardImg: { width: '100%', height: '95px', objectFit: 'cover' },
  cardBody: { padding: '8px' },
  cardTitle: { fontSize: '10px', fontWeight: 'bold', height: '24px', overflow: 'hidden', marginBottom: '2px' },
  cardPrice: { fontSize: '13px', fontWeight: 'bold', color: '#10b981' },
  markupTag: { fontSize: '9px', background: '#ecfdf5', color: '#059669', padding: '1px 4px', borderRadius: '4px', fontWeight: '800' },
  cardActions: { display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px' },
  btnSlim: { padding: '4px', fontSize: '9px', fontWeight: 'bold', border: 'none', borderRadius: '3px', background: '#f1f5f9', cursor: 'pointer' },
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
  catItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' },
  btnAddCat: { width: '100%', padding: '5px', fontSize: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' },
  btnActionSmall: { padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  btnMini: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '10px' }
};

const shopeeStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { background: '#fff', width: '700px', borderRadius: '4px', overflow: 'hidden' },
  header: { padding: '16px 20px', borderBottom: '1px solid #efefef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '18px', fontWeight: 500 },
  closeBtn: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' },
  content: { padding: '20px', backgroundColor: '#fafafa', maxHeight: '70vh', overflowY: 'auto' },
  section: { marginBottom: '24px' },
  label: { display: 'block', marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' },
  varBox: { background: '#fff', padding: '16px', border: '1px solid #e5e5e5' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  input: { border: '1px solid #ddd', padding: '8px', width: '200px' },
  optionsGrid: { display: 'flex', gap: '10px' },
  tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 },
  tagInputWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #ddd' },
  tagInput: { border: 'none', padding: '6px 10px', width: '100px' },
  delTag: { border: 'none', background: '#f5f5f5', padding: '6px 8px', cursor: 'pointer' },
  addBtn: { border: '1px dashed #ee4d2d', color: '#ee4d2d', background: '#fff', padding: '6px 12px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  trHead: { background: '#f6f6f6' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e5e5' },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '10px 12px' },
  tableInput: { width: '100%', padding: '8px', border: '1px solid #ddd' },
  footer: { padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #efefef' },
  btnCancel: { padding: '8px 20px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' },
  btnConfirm: { padding: '8px 20px', border: 'none', background: '#ee4d2d', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }
};