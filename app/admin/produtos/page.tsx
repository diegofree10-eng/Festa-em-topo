"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase"; 
import {
  collection, addDoc, doc, query, orderBy, 
  updateDoc, deleteDoc, onSnapshot, writeBatch
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function CadastroProdutos() {
  const [uid, setUid] = useState(null);
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
  const [files, setFiles] = useState([]);
  const [imagens, setImagens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [modoMassa, setModoMassa] = useState(false);
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    let unsubProdutos = null;
    let unsubCategorias = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        
        // ESCUTA DE PRODUTOS COM ESCUDO DE PERMISSÃO REFORÇADO
        unsubProdutos = onSnapshot(
          query(collection(db, "lojistas", user.uid, "produtos"), orderBy("createdAt", "desc")), 
          (snap) => {
            setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          },
          (error) => {
            // Silencia o erro de permissão completamente
            if (error.code === "permission-denied") return;
            console.error("Erro Produtos:", error);
          }
        );

        // ESCUTA DE CATEGORIAS COM ESCUDO DE PERMISSÃO REFORÇADO
        unsubCategorias = onSnapshot(
          query(collection(db, "lojistas", user.uid, "categorias"), orderBy("nome", "asc")), 
          (snap) => {
            setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          },
          (error) => {
            // Silencia o erro de permissão completamente
            if (error.code === "permission-denied") return;
            console.error("Erro Categorias:", error);
          }
        );
      } else {
        // ORDEM DE LIMPEZA CRÍTICA: Desinscrever antes de limpar o UID
        if (unsubProdutos) {
          unsubProdutos();
          unsubProdutos = null;
        }
        if (unsubCategorias) {
          unsubCategorias();
          unsubCategorias = null;
        }
        
        setUid(null);
        setProdutos([]);
        setListaCategorias([]);

        // Evita que a página tente re-renderizar dados protegidos
        if (window.location.pathname !== "/") {
          window.location.replace("/");
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubProdutos) unsubProdutos();
      if (unsubCategorias) unsubCategorias();
    };
  }, []);

  // --- O restante das funções (formatInput, salvar, etc) permanecem iguais ---
  // [Mantendo a lógica original do Diego para não quebrar as funcionalidades]
  
  const formatInput = (value, setter) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) { setter(""); return; }
    const amount = (parseInt(cleanValue) / 100).toFixed(2);
    setter(amount);
  };

  const calcularLucro = (venda, custo) => {
    const v = parseFloat(venda); 
    const c = parseFloat(custo);
    if (!v || !c || c === 0) return null;
    return (((v - c) / c) * 100).toFixed(0);
  };

  async function uploadImagens() {
    if (imagens.length + files.length > 4) return alert("Máximo 4 fotos.");
    setUploading(true);
    const urls = [];
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
    setImagens([...imagens, ...urls]); setFiles([]); setUploading(false);
  }

  async function acaoEmMassa(tipo) {
    if (selecionados.length === 0) return;
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
    setLoading(true);

    const dados = {
      nome, 
      descricao, 
      categoria, 
      precoBasico: precoBasico || "0.00", 
      custoUnitario: custoUnitario || "0.00", 
      ativo, 
      precisaFrete,
      peso: precisaFrete ? (parseFloat(peso) > 0 ? peso : "0.10") : "0.00",
      comprimento: precisaFrete ? (parseFloat(comprimento) >= 13 ? comprimento : "13.00") : "0.00",
      largura: precisaFrete ? (parseFloat(largura) >= 10 ? largura : "10.00") : "0.00",
      altura: precisaFrete ? (parseFloat(altura) >= 2 ? altura : "2.00") : "0.00",
      imagens, 
      capa: imagens[0] || "", 
      updatedAt: Date.now()
    };

    try {
      if (editId) await updateDoc(doc(db, "lojistas", uid, "produtos", editId), dados);
      else await addDoc(collection(db, "lojistas", uid, "produtos"), { ...dados, destaque: false, createdAt: Date.now() });
      limparForm();
    } catch (e) { alert("Erro ao salvar."); }
    setLoading(false);
  }

  const limparForm = () => {
    setNome(""); setDescricao(""); setCategoria(""); setPrecoBasico(""); setCustoUnitario("");
    setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]); setPrecisaFrete(true);
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
            <textarea 
              style={styles.modalTextarea} 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              placeholder="Digite aqui a descrição completa do seu produto..."
              autoFocus
            />
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
              <button onClick={() => setShowDescModal(false)} style={styles.btnSave}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.sidebar}>
        <h3 style={styles.sideTitle}>{editId ? "📝 Editar Produto" : "📦 Novo Produto"}</h3>
        <input style={styles.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Produto" />
        
        <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
          <select style={{...styles.input, marginBottom:0, flex: 1}} value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="">Categoria...</option>
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
                  <button onClick={() => {const n=prompt("Novo:",c.nome); if(n) updateDoc(doc(db,"lojistas",uid,"categorias",c.id),{nome:n})}} style={styles.btnMini}>✏️</button>
                  <button onClick={() => {if(confirm("Exc?")) deleteDoc(doc(db,"lojistas",uid,"categorias",c.id))}} style={styles.btnMini}>❌</button>
                </div>
              </div>
            ))}
            <button onClick={() => {const n=prompt("Nova:"); if(n) addDoc(collection(db,"lojistas",uid,"categorias"),{nome:n})}} style={styles.btnAddCat}>+ Adicionar</button>
          </div>
        )}

        <div style={styles.freteBox}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={precisaFrete} onChange={e => setPrecisaFrete(e.target.checked)} /> 
            <span>Produto Físico (Frete)</span>
          </label>
          {!precisaFrete && <p style={{fontSize:'10px', color:'#3b82f6', marginTop:'5px'}}>* Digital: Medidas ignoradas.</p>}
        </div>

        <textarea 
          style={{...styles.textarea, cursor: 'pointer'}} 
          value={descricao} 
          onClick={() => setShowDescModal(true)}
          readOnly
          placeholder="Clique para editar a descrição..." 
        />

        {precisaFrete && (
          <div style={styles.boxGray}>
            <label style={styles.miniLabel}>Medidas Melhor Envio</label>
            <div style={styles.grid2}>
              <input style={styles.inputSmall} value={peso} onChange={e => formatInput(e.target.value, setPeso)} placeholder="Peso kg" />
              <input style={styles.inputSmall} value={comprimento} onChange={e => formatInput(e.target.value, setComprimento)} placeholder="Comp cm" />
              <input style={styles.inputSmall} value={largura} onChange={e => formatInput(e.target.value, setLargura)} placeholder="Larg cm" />
              <input style={styles.inputSmall} value={altura} onChange={e => formatInput(e.target.value, setAltura)} placeholder="Alt cm" />
            </div>
          </div>
        )}

        <div style={styles.boxGray}>
          <label style={styles.miniLabel}>Valores R$</label>
          <div style={{display:'flex', gap:'5px'}}>
            <input style={{...styles.input, marginBottom:0}} value={precoBasico} onChange={e => formatInput(e.target.value, setPrecoBasico)} placeholder="Venda" />
            <input style={{...styles.input, marginBottom:0}} value={custoUnitario} onChange={e => formatInput(e.target.value, setCustoUnitario)} placeholder="Custo" />
          </div>
        </div>

        <div style={styles.previewGrid}>
          {files.map((f, i) => (
             <img key={'new'+i} src={URL.createObjectURL(f)} style={{...styles.imgThumb, border:'2px solid #3b82f6'}} alt="preview" />
          ))}
          {imagens.map((img, i) => (
            <div key={'old'+i} style={{position:'relative'}}>
              <img src={img} style={styles.imgThumb} alt="salva" />
              <button onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} style={styles.btnDelImg}>×</button>
            </div>
          ))}
        </div>

        <button style={styles.btnUpload}>
          <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files))} style={styles.fileInvis} />
          {uploading ? "Salvando..." : "📷 Escolher Fotos (Máx 4)"}
        </button>
        {files.length > 0 && !uploading && (
          <button onClick={uploadImagens} style={styles.btnConfirmImgs}>Confirmar {files.length} fotos</button>
        )}

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
            <button onClick={() => {setModoMassa(!modoMassa); setSelecionados([]);}} 
              style={{...styles.btnGeneric, background: modoMassa ? '#3b82f6' : '#fff', color: modoMassa ? '#fff' : '#3b82f6'}}>
              {modoMassa ? "Sair" : "Massa"}
            </button>
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
                {modoMassa && (
                  <input type="checkbox" style={styles.cardCheck} checked={selecionados.includes(p.id)} onChange={e => e.target.checked ? setSelecionados([...selecionados, p.id]) : setSelecionados(selecionados.filter(id => id !== p.id))} />
                )}
                <img src={p.capa} style={styles.cardImg} alt="capa" />
                <div style={styles.cardBody}>
                  <h4 style={styles.cardTitle}>{p.nome}</h4>
                  <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px'}}>
                    <span style={styles.cardPrice}>R$ {p.precoBasico}</span>
                    {lucro && <span style={styles.markupTag}>+{lucro}%</span>}
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => updateDoc(doc(db,"lojistas",uid,"produtos",p.id), {destaque: !p.destaque})} style={styles.btnSlim}>{p.destaque ? "⭐ Destacado" : "☆ Destacar"}</button>
                    <button onClick={() => {
                      setEditId(p.id); 
                      setNome(p.nome); 
                      setCategoria(p.categoria || "");
                      setPrecoBasico(p.precoBasico || ""); 
                      setCustoUnitario(p.custoUnitario || ""); 
                      setImagens(p.imagens || []); 
                      setPrecisaFrete(p.precisaFrete); 
                      setDescricao(p.descricao || "");
                      setPeso(p.peso || "");
                      setComprimento(p.comprimento || "");
                      setLargura(p.largura || "");
                      setAltura(p.altura || "");
                    }} style={styles.btnSlim}>✏️ Editar</button>
                    <button onClick={() => updateDoc(doc(db,"lojistas",uid,"produtos",p.id), {ativo: !p.ativo})} style={styles.btnSlim}>{p.ativo ? "🚫 Ocultar" : "👁️ Mostrar"}</button>
                    <button onClick={() => {if(confirm("Excluir?")) deleteDoc(doc(db,"lojistas",uid,"produtos",p.id))}} style={{...styles.btnSlim, color:'#ef4444'}}>🗑️ Excluir</button>
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

// Estilos permanecem os mesmos (omitidos aqui por brevidade, mas devem ser mantidos conforme o seu original)
const styles = {
  page: { display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '20px', borderRadius: '12px', width: '80%', maxWidth: '600px', height: '70vh', display: 'flex', flexDirection: 'column' },
  modalTextarea: { flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'none', lineHeight: '1.5' },
  sidebar: { width: '260px', minWidth: '260px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box' },
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