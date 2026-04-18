"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

export default function DetalhesProduto() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fotoAtiva, setFotoAtiva] = useState(null);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState("Basico");
  const [lojaAberta, setLojaAberta] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    handleResize();
    window.addEventListener("resize", handleResize);

    const unsubLoja = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) {
        setLojaAberta(snap.data().lojaAberta ?? true);
      }
    });

    async function carregarProduto() {
      if (!id) return;
      const docRef = doc(db, "produtos", id);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const dados = snap.id ? { id: snap.id, ...snap.data() } : null;
        setProduto(dados);
        setFotoAtiva(dados?.capa);
      }
      setLoading(false);
    }

    carregarProduto();
    return () => {
      unsubLoja();
      window.removeEventListener("resize", handleResize);
    };
  }, [id]);

  const handleAddCart = () => {
    if (!lojaAberta) return;
    const precoFinal = produto.categoria === "Kit Festa" 
      ? (variacaoSelecionada === "Basico" ? produto.precoBasico : variacaoSelecionada === "Completo" ? produto.precoCompleto : produto.precoPremium)
      : produto.precoBasico;

    const item = { ...produto, preco: precoFinal, variacao: produto.categoria === "Kit Festa" ? variacaoSelecionada : null };
    addToCart(item);
    router.push("/carrinho");
  };

  if (loading) return <div style={styles.center}>Carregando detalhes...</div>;
  if (!produto) return <div style={styles.center}>Produto não encontrado!</div>;

  return (
    // AJUSTE: overflowX hidden e maxWidth 100vw para matar o scroll horizontal
    <div style={{...styles.container, maxWidth: '100vw', overflowX: 'hidden'}}>
      <button onClick={() => router.back()} style={styles.btnVoltar}>← Voltar para a Loja</button>

      <div style={{
        ...styles.content,
        gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
        gap: isMobile ? "20px" : "40px",
        width: '100%' // Garante que o grid não estoure
      }}>
        
        <div style={styles.gallery}>
          <div style={{...styles.mainImgWrapper, height: isMobile ? "300px" : "420px"}}>
            <img src={fotoAtiva || null} style={styles.mainImg} alt={produto.nome} />
          </div>
          <div style={styles.thumbs}>
            {produto.imagens?.map((img, i) => (
              <img 
                key={i} 
                src={img} 
                style={{...styles.thumbImg, border: fotoAtiva === img ? '2px solid #2ecc71' : '2px solid transparent'}} 
                onClick={() => setFotoAtiva(img)} 
              />
            ))}
          </div>
        </div>

        <div style={styles.infoColumn}>
          <div style={{...styles.infoBlock, height: isMobile ? "auto" : "420px"}}>
            <div style={styles.topText}>
              <span style={styles.badge}>{produto.categoria}</span>
              <h1 style={styles.titulo}>{produto.nome}</h1>
              
              <div style={styles.precoBox}>
                {produto.categoria === "Kit Festa" ? (
                  <div style={styles.variacoes}>
                    <p style={styles.labelSelect}>Escolha o seu Kit:</p>
                    <div style={styles.gridVariacoes}>
                      {["Basico", "Completo", "Premium"].map((v) => (
                        <button 
                          key={v}
                          disabled={!lojaAberta}
                          onClick={() => setVariacaoSelecionada(v)}
                          style={{
                            ...styles.btnVariacao, 
                            borderColor: v === "Basico" ? '#2ecc71' : v === "Completo" ? '#3498db' : '#f1c40f', 
                            background: variacaoSelecionada === v ? (v === "Basico" ? '#2ecc71' : v === "Completo" ? '#3498db' : '#f1c40f') : "#fff", 
                            color: variacaoSelecionada === v ? "#fff" : (v === "Basico" ? '#2ecc71' : v === "Completo" ? '#3498db' : '#f1c40f'), 
                            opacity: lojaAberta ? 1 : 0.6
                          }}
                        >
                          {v === "Basico" ? "Básico" : v}: R$ {produto[`preco${v}`]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <h2 style={styles.precoUnico}>R$ {produto.precoBasico}</h2>
                )}
              </div>
            </div>

            <div style={{...styles.descricaoBox, marginTop: isMobile ? "20px" : "10px"}}>
              <h3 style={styles.subtitulo}>Descrição:</h3>
              <div style={{...styles.scrollDesc, maxHeight: isMobile ? "none" : "175px"}}>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{produto.descricao}</p>
              </div>
            </div>
          </div>

          <div style={styles.btnArea}>
            <button 
              onClick={handleAddCart} 
              disabled={!lojaAberta}
              style={{
                ...styles.btnAdd,
                background: lojaAberta ? "#2ecc71" : "#94a3b8",
                cursor: lojaAberta ? "pointer" : "not-allowed",
                width: isMobile ? "100%" : "240px"
              }}
            >
              {lojaAberta ? "🛒 Adicionar ao Carrinho" : "Indisponível"}
            </button>
          </div>
          {!lojaAberta && (
            <p style={{textAlign: 'center', fontSize: '11px', color: '#e74c3c', marginTop: '8px', fontWeight: 'bold'}}>
              Estamos em recesso. Pedidos desativados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  // AJUSTE: container agora usa box-sizing e largura máxima segura
  container: { maxWidth: "1100px", margin: "0 auto", padding: "10px 20px", fontFamily: "'Segoe UI', sans-serif", boxSizing: "border-box" },
  btnVoltar: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", marginBottom: "15px", fontSize: "14px", fontWeight: "bold" },
  content: { display: "grid", gap: "40px", alignItems: "start", boxSizing: "border-box" },
  gallery: { display: "flex", flexDirection: "column", width: "100%" },
  mainImgWrapper: { width: "100%", borderRadius: "15px", overflow: "hidden", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9" },
  mainImg: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  thumbs: { display: "flex", gap: "10px", marginTop: "12px", justifyContent: "center", flexWrap: "wrap" },
  thumbImg: { width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px", cursor: "pointer" },
  infoColumn: { display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box" },
  infoBlock: { display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: "5px" },
  topText: { display: "flex", flexDirection: "column", gap: "8px" },
  badge: { background: "#f1f5f9", color: "#64748b", padding: "4px 12px", borderRadius: "20px", width: "fit-content", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" },
  titulo: { fontSize: "26px", color: "#1e293b", fontWeight: "800", lineHeight: "1.2", margin: 0, wordBreak: "break-word" },
  gridVariacoes: { display: "flex", flexDirection: "column", gap: "6px", marginTop: "5px" },
  labelSelect: { fontSize: "12px", color: "#64748b", fontWeight: "bold", margin: "5px 0 2px 0" },
  btnVariacao: { padding: "8px 12px", border: "2px solid", borderRadius: "10px", cursor: "pointer", textAlign: "left", fontWeight: "bold", fontSize: "14px", transition: "0.2s" },
  precoUnico: { color: "#2ecc71", fontSize: "30px", fontWeight: "800" },
  descricaoBox: { marginTop: "10px" },
  subtitulo: { fontSize: "13px", color: "#1e293b", marginBottom: "3px", fontWeight: "bold" },
  scrollDesc: { overflowY: "auto", fontSize: "14px", color: "#475569", lineHeight: "1.4", wordBreak: "break-word" },
  btnArea: { display: "flex", justifyContent: "center", marginTop: "25px" }, 
  btnAdd: { color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold", fontSize: "15px", transition: "0.3s" },
  center: { textAlign: "center", marginTop: "100px", color: "#64748b" }
};