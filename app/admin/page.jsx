"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, updateDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Admin() {
  const router = useRouter();
  
  const [isLogged, setIsLogged] = useState(false);
  const [password, setPassword] = useState("");

  const [nome, setNome] = useState("");
  const [precoBasico, setPrecoBasico] = useState("");
  const [precoCompleto, setPrecoCompleto] = useState("");
  const [precoPremium, setPrecoPremium] = useState("");
  
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [files, setFiles] = useState([]);
  const [imagens, setImagens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);

  const [listaCategorias, setListaCategorias] = useState([]);
  const [novaCategoria, setNovaCategoria] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");

  const colRef = collection(db, "produtos");
  const catRef = collection(db, "categorias");

  function handleLogin() {
    const SENHA_MESTRE = "1234"; 
    if (password === SENHA_MESTRE) {
      setIsLogged(true);
      carregarTudo();
    } else {
      alert("Senha incorreta! ❌");
    }
  }

  const formatMoneyInput = (value) => {
    let v = value.replace(/\D/g, "");
    v = (Number(v) / 100).toFixed(2);
    return v.replace(".", ",");
  };

  async function carregarTudo() {
    carregarProdutos();
    carregarCategorias();
  }

  async function carregarProdutos() {
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function carregarCategorias() {
    const snap = await getDocs(catRef);
    const cats = snap.docs.map(d => ({ id: d.id, nome: d.data().nome }));
    setListaCategorias(cats);
    if (cats.length > 0 && !categoria) setCategoria(cats[0].nome);
  }

  async function adicionarCategoria() {
    if (!novaCategoria) return;
    try {
      await addDoc(catRef, { nome: novaCategoria.trim() });
      setNovaCategoria("");
      carregarCategorias();
      alert("Categoria adicionada!");
    } catch (e) { alert("Erro ao salvar categoria"); }
  }

  async function excluirCategoria(id) {
    if (confirm("Deseja excluir esta categoria?")) {
      await deleteDoc(doc(db, "categorias", id));
      carregarCategorias();
    }
  }

  async function alternarDestaque(id, destaqueAtual) {
    await updateDoc(doc(db, "produtos", id), { destaque: !destaqueAtual });
    carregarProdutos();
  }

  async function salvar() {
    if (!nome || !precoBasico || !descricao || !categoria) {
      alert("Atenção: Nome, Categoria, Descrição e Preço Básico são obrigatórios!");
      return;
    }
    setLoading(true);

    const dados = {
      nome, 
      precoBasico, 
      precoCompleto: categoria === "Kit Festa" ? precoCompleto : precoBasico,
      precoPremium: categoria === "Kit Festa" ? precoPremium : precoBasico,
      descricao, 
      categoria: categoria.trim(),
      imagens,
      capa: imagens[0] || "",
    };

    if (editId) {
      await updateDoc(doc(db, "produtos", editId), dados);
      setEditId(null);
    } else {
      await addDoc(colRef, { ...dados, destaque: false, createdAt: Date.now() });
    }

    setNome(""); setPrecoBasico(""); setPrecoCompleto(""); setPrecoPremium(""); 
    setDescricao(""); setFiles([]); setImagens([]);
    carregarProdutos(); setLoading(false);
  }

  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = filtroCategoria === "Todos" || p.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  if (!isLogged) {
    return (
      <div style={styles.loginOverlay}>
        <div style={styles.loginBox}>
          <h2>🔐 Acesso Admin</h2>
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <button onClick={handleLogin} style={styles.btnGreen}>Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        
        <div style={styles.catManagerBox}>
          <h3 style={{ color: "#3498db", marginBottom: "10px" }}>➕ Criar Categorias</h3>
          <div style={{ display: "flex", gap: 5 }}>
            <input placeholder="Ex: Kit Festa" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} style={styles.inputCompact} />
            <button onClick={adicionarCategoria} style={styles.btnPlus}>ADD</button>
          </div>
          <div style={styles.catBadgeList}>
            {listaCategorias.map(c => (
              <span key={c.id} style={styles.catBadge}>
                {c.nome} <b onClick={() => excluirCategoria(c.id)} style={{ cursor: "pointer", marginLeft: "5px" }}>×</b>
              </span>
            ))}
          </div>
        </div>

        {/* BOTÕES DE NAVEGAÇÃO PRINCIPAL */}
        <button onClick={() => router.push("/admin/pedidos")} style={styles.btnPedidos}>
          📊 Relatório de Pedidos
        </button>

        <button onClick={() => router.push("/admin/config")} style={styles.btnConfig}>
          ⚙️ Configurações Gerais (PIX/Frete)
        </button>

        <hr style={{ margin: "20px 0", opacity: 0.1 }} />

        <h2>📦 {editId ? "Editar Produto" : "Novo Produto"}</h2>
        <input placeholder="Nome do Produto" value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
        
        <label style={styles.label}>Categoria:</label>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={styles.input}>
          <option value="">Selecione...</option>
          {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </select>

        {categoria === "Kit Festa" ? (
          <div style={styles.variationPrices}>
            <label style={styles.label}>Preços do Kit:</label>
            <input placeholder="Preço Básico" value={precoBasico} onChange={(e) => setPrecoBasico(formatMoneyInput(e.target.value))} style={styles.input} />
            <input placeholder="Preço Completo" value={precoCompleto} onChange={(e) => setPrecoCompleto(formatMoneyInput(e.target.value))} style={styles.input} />
            <input placeholder="Preço Premium" value={precoPremium} onChange={(e) => setPrecoPremium(formatMoneyInput(e.target.value))} style={styles.input} />
          </div>
        ) : (
          <div>
            <label style={styles.label}>Preço Único:</label>
            <input placeholder="R$ 0,00" value={precoBasico} onChange={(e) => setPrecoBasico(formatMoneyInput(e.target.value))} style={styles.input} />
          </div>
        )}

        <label style={styles.label}>Descrição:</label>
        <textarea placeholder="Descrição do produto..." value={descricao} onChange={(e) => setDescricao(e.target.value)} style={styles.textarea} />
        
        <div style={{ marginTop: "10px" }}>
          <label style={styles.label}>Adicionar Fotos:</label>
          <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files))} style={styles.inputFile} />
          <button 
            type="button"
            onClick={async () => {
              if (files.length === 0) return alert("Selecione fotos primeiro!");
              setUploading(true);
              const urls = [];
              for (let file of files) {
                const formData = new FormData();
                formData.append("file", file); 
                formData.append("upload_preset", "eep2qiix");
                const res = await fetch("https://api.cloudinary.com/v1_1/dbzydexo2/image/upload", { method: "POST", body: formData });
                const data = await res.json(); 
                if (data.secure_url) urls.push(data.secure_url);
              }
              setImagens([...imagens, ...urls]); 
              setFiles([]);
              setUploading(false);
            }} 
            style={uploading ? styles.btnDisabled : styles.btnBlueSmall}
            disabled={uploading}
          >
            {uploading ? "Enviando..." : "☁️ Confirmar Fotos"}
          </button>
        </div>
        
        <div style={styles.previewGrid}>
          {imagens.map((img, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={img || null} style={styles.previewImg} alt="Preview" />
              <button onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} style={styles.btnRemoveImg}>×</button>
            </div>
          ))}
        </div>

        <button onClick={salvar} style={styles.btnGreen}>{loading ? "Gravando..." : "Salvar Produto"}</button>
        {editId && <button onClick={() => { setEditId(null); setNome(""); setPrecoBasico(""); setPrecoCompleto(""); setPrecoPremium(""); setDescricao(""); setImagens([]); }} style={styles.btnCancel}>Cancelar Edição</button>}
      </div>

      <div style={styles.mainContent}>
        <div style={styles.searchHeader}>
          <h2>🔎 Localizar Produto</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <input placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ ...styles.input, marginBottom: 0, width: "200px" }}>
              <option value="Todos">Todas Categorias</option>
              {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.scrollArea}>
          <div style={styles.grid}>
            {produtosFiltrados.map((p) => (
              <div key={p.id} style={styles.cardProduct}>
                <div style={styles.badge}>{p.categoria}</div>
                {p.destaque && <div style={styles.starBadge}>⭐</div>}
                {p.capa ? (
                  <img src={p.capa} style={styles.productImg} alt={p.nome} />
                ) : (
                  <div style={{...styles.productImg, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999'}}>Sem Foto</div>
                )}

                <div style={{ padding: "8px" }}>
                  <strong style={styles.productTitle}>{p.nome}</strong>
                  <div style={styles.cardPrices}>
                    {p.categoria === "Kit Festa" ? (
                      <>
                        <span style={{color: '#2ecc71'}}>B: R${p.precoBasico}</span>
                        <span style={{color: '#3498db'}}>C: R${p.precoCompleto}</span>
                        <span style={{color: '#f1c40f'}}>P: R${p.precoPremium}</span>
                      </>
                    ) : (
                      <span style={{color: '#2ecc71', fontSize: '12px'}}>R$ {p.precoBasico}</span>
                    )}
                  </div>
                  <div style={styles.btnGroup}>
                    <button onClick={() => alternarDestaque(p.id, p.destaque)} style={{ ...styles.btnAction, background: p.destaque ? "#f1c40f" : "#ecf0f1" }}>
                      {p.destaque ? "★ No Topo" : "☆ Destacar"}
                    </button>
                    <button onClick={() => {
                       setEditId(p.id); setNome(p.nome); 
                       setPrecoBasico(p.precoBasico); setPrecoCompleto(p.precoCompleto || ""); setPrecoPremium(p.precoPremium || "");
                       setDescricao(p.descricao); setImagens(p.imagens); setCategoria(p.categoria);
                    }} style={styles.btnAction}>Editar</button>
                    <button onClick={() => deleteDoc(doc(db, "produtos", p.id)).then(carregarProdutos)} style={styles.btnActionDelete}>Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: "flex", height: "100vh", background: "#f5f7fb", fontFamily: "sans-serif", overflow: "hidden" },
  sidebar: { width: "350px", background: "#fff", padding: "20px", boxShadow: "2px 0 10px rgba(0,0,0,0.05)", overflowY: "auto", height: "100%" },
  catManagerBox: { background: "#ebf5fb", padding: "15px", borderRadius: "12px", border: "2px solid #3498db", marginBottom: "20px" },
  catBadgeList: { display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" },
  catBadge: { background: "#3498db", color: "#fff", padding: "3px 8px", borderRadius: "15px", fontSize: "11px", display: "flex", alignItems: "center" },
  btnPlus: { background: "#3498db", color: "#fff", border: "none", borderRadius: "6px", padding: "0 10px", cursor: "pointer", fontWeight: "bold" },
  inputCompact: { flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" },
  mainContent: { flex: 1, display: "flex", flexDirection: "column", padding: "20px" },
  searchHeader: { background: "#fff", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  scrollArea: { flex: 1, overflowY: "auto", paddingRight: "10px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", paddingBottom: "50px" },
  cardProduct: { background: "#fff", borderRadius: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" },
  badge: { position: "absolute", top: 5, right: 5, background: "rgba(44, 62, 80, 0.8)", color: "#fff", fontSize: "8px", padding: "2px 5px", borderRadius: "10px", zIndex: 2 },
  starBadge: { position: "absolute", top: 5, left: 5, background: "#f1c40f", borderRadius: "50%", padding: "2px", zIndex: 2 },
  productImg: { width: "100%", height: "80px", objectFit: "cover" },
  productTitle: { fontSize: "11px", fontWeight: "bold", display: "block", color: "#2c3e50", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardPrices: { fontSize: "9px", fontWeight: "bold", marginBottom: "5px", display: "flex", flexDirection: "column", gap: "1px" },
  input: { width: "100%", padding: "10px", marginBottom: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" },
  textarea: { width: "100%", padding: "10px", height: "100px", marginBottom: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", resize: "vertical" },
  label: { fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "3px", display: "block" },
  btnPedidos: { width: "100%", padding: "12px", background: "#2c3e50", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", marginBottom: "10px" },
  btnConfig: { width: "100%", padding: "12px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" },
  btnGreen: { background: "#2ecc71", color: "#fff", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", width: "100%", fontWeight: "bold", marginTop: "10px" },
  btnBlueSmall: { background: "#3498db", color: "#fff", padding: "10px", borderRadius: "6px", border: "none", cursor: "pointer", width: "100%", fontSize: "12px", marginBottom: "10px", fontWeight: "bold" },
  btnDisabled: { background: "#bdc3c7", color: "#fff", padding: "10px", borderRadius: "6px", border: "none", width: "100%", fontSize: "12px", cursor: "not-allowed", marginBottom: "10px" },
  btnGroup: { display: "flex", flexDirection: "column", gap: "3px" },
  btnAction: { width: "100%", padding: "4px", borderRadius: "4px", border: "none", background: "#f8f9fa", cursor: "pointer", fontSize: "9px" },
  btnActionDelete: { width: "100%", padding: "4px", borderRadius: "4px", border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: "9px" },
  btnCancel: { width: "100%", background: "none", border: "none", color: "#94a3b8", fontSize: "12px", marginTop: "10px", cursor: "pointer" },
  loginOverlay: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f0f2f5" },
  loginBox: { background: "#fff", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center" },
  previewGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px", marginBottom: "10px" },
  previewImg: { width: "100%", height: "40px", objectFit: "cover", borderRadius: "4px" },
  btnRemoveImg: { position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '15px', height: '15px', fontSize: '10px', cursor: 'pointer' },
  inputFile: { fontSize: "12px", marginBottom: "10px", display: "block", width: "100%", padding: "8px", background: "#f8f9fa", borderRadius: "6px", border: "1px solid #ddd" },
  variationPrices: { background: "#fcfcfc", padding: "5px", borderRadius: "8px", border: "1px dashed #ddd" }
};