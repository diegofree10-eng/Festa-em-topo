"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useSearchParams, useRouter } from "next/navigation";

export default function ProdutoAgrupadoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [produto, setProduto] = useState<any>(null);
  const [imgAtiva, setImgAtiva] = useState("");
  const [corSelecionada, setCorSelecionada] = useState(""); 
  const [variacaoFinal, setVariacaoFinal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const id = params?.id;
        const lojaID = searchParams.get("loja");
        if (!id || !lojaID) return;

        const ref = doc(db, "lojistas", lojaID, "produtos", id as string);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          setProduto(data);
          
          // Imagem principal inicial é a capa
          setImgAtiva(data.capa || "");
          
          // Seleciona a primeira cor das variações por padrão
          if (data.variacoes?.length > 0) {
            const primeiraCor = (data.variacoes[0].cor || data.variacoes[0].v1 || "").trim();
            setCorSelecionada(primeiraCor);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params, searchParams]);

  // --- LÓGICA DE EXIBIÇÃO ---

  // 1. Galeria da Lateral Esquerda (Apenas as fotos carregadas no Sidebar + Capa)
  const galeriaLateral = useMemo(() => {
    if (!produto) return [];
    // Prioriza a capa e depois as fotos extras da galeria
    const fotos = [];
    if (produto.capa) fotos.push(produto.capa);
    if (produto.imagens && Array.isArray(produto.imagens)) {
      fotos.push(...produto.imagens);
    }
    // Retorna apenas as 4 ou 5 primeiras fotos únicas para não poluir
    return Array.from(new Set(fotos)).slice(0, 5);
  }, [produto]);

  // 2. Cores únicas para o seletor (Lado Direito)
  const listaCoresUnicas = useMemo(() => {
    if (!produto?.variacoes) return [];
    const vistas = new Set();
    return produto.variacoes.filter((v: any) => {
      const nomeCor = (v.cor || v.v1 || "padrão").trim().toLowerCase();
      if (vistas.has(nomeCor)) return false;
      vistas.add(nomeCor);
      return true;
    });
  }, [produto?.variacoes]);

  // 3. Filtra variações (Tamanhos) pela cor selecionada
  const tamanhosDisponiveis = useMemo(() => {
    if (!corSelecionada || !produto?.variacoes) return [];
    return produto.variacoes.filter((v: any) => 
      (v.cor || v.v1 || "").trim().toLowerCase() === corSelecionada.toLowerCase()
    );
  }, [corSelecionada, produto?.variacoes]);

  if (loading) return <div style={styles.center}>Carregando...</div>;
  if (!produto) return <div style={styles.center}>Produto não encontrado.</div>;

  return (
    <div style={styles.wrapper}>
      <button onClick={() => router.back()} style={styles.btnBack}> ← Voltar </button>

      <div style={styles.mainCard}>
        
        {/* LADO ESQUERDO: BARRA LATERAL + IMAGEM PRINCIPAL */}
        <div style={styles.leftSide}>
          <div style={styles.containerVisualizacao}>
            {/* 4 CARDS DA BARRA LATERAL */}
            <div style={styles.sidebarFotos}>
              {galeriaLateral.map((img: any, idx: number) => (
                <div 
                  key={idx}
                  onMouseEnter={() => setImgAtiva(img)} // Troca ao passar o mouse ou clique
                  onClick={() => setImgAtiva(img)}
                  style={{
                    ...styles.miniCard,
                    borderColor: imgAtiva === img ? '#ee4d2d' : '#eee'
                  }}
                >
                  <img src={img} style={styles.miniImg} alt={`Galeria ${idx}`} />
                </div>
              ))}
            </div>

            {/* FOTO GRANDE PRINCIPAL */}
            <div style={styles.imgPrincipalContainer}>
              <img src={imgAtiva} style={styles.mainImg} alt={produto.nome} />
            </div>
          </div>
        </div>

        {/* LADO DIREITO: INFORMAÇÕES E SELEÇÃO */}
        <div style={styles.rightSide}>
          <h1 style={styles.title}>{produto.nome}</h1>
          
          <div style={styles.priceBox}>
            <p style={styles.labelPreco}>Preço da variação:</p>
            <span style={styles.price}>
              R$ {variacaoFinal ? variacaoFinal.preco : (produto.precoBasico || "0,00")}
            </span>
          </div>

          {/* PASSO 1: CORES */}
          <div style={styles.section}>
            <label style={styles.label}>1. ESCOLHA O MODELO/COR:</label>
            <div style={styles.gridCores}>
              {listaCoresUnicas.map((item: any, i: number) => {
                const nomeCorItem = (item.cor || item.v1 || "").trim();
                const isAtivo = corSelecionada.toLowerCase() === nomeCorItem.toLowerCase();
                
                return (
                  <div 
                    key={i}
                    onClick={() => {
                      setCorSelecionada(nomeCorItem);
                      setImgAtiva(item.foto); // Sincroniza a imagem principal com a cor
                      setVariacaoFinal(null); 
                    }}
                    style={{
                      ...styles.cardCor,
                      borderColor: isAtivo ? '#ee4d2d' : '#eee',
                    }}
                  >
                    <img src={item.foto} style={styles.imgCardCor} alt={nomeCorItem} />
                    {isAtivo && <div style={styles.check}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PASSO 2: TAMANHOS */}
          <div style={styles.boxSelecao}>
            <label style={styles.label}>2. AGORA ESCOLHA O TAMANHO:</label>
            <div style={styles.gridTamanhos}>
              {tamanhosDisponiveis.map((op: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => setVariacaoFinal(op)}
                  style={{
                    ...styles.sizeBtn,
                    backgroundColor: variacaoFinal?.nome === op.nome ? '#ee4d2d' : '#fff',
                    color: variacaoFinal?.nome === op.nome ? '#fff' : '#333',
                    borderColor: variacaoFinal?.nome === op.nome ? '#ee4d2d' : '#ddd'
                  }}
                >
                  {op.nome}
                </button>
              ))}
            </div>
          </div>

          <button 
            disabled={!variacaoFinal}
            style={{
              ...styles.btnComprar, 
              backgroundColor: variacaoFinal ? '#ee4d2d' : '#ccc',
            }}
          >
            {variacaoFinal ? 'ADICIONAR AO CARRINHO' : 'SELECIONE O TAMANHO'}
          </button>
        </div>

      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
  btnBack: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '10px' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' },
  
  mainCard: { display: 'flex', gap: '30px', background: '#fff', padding: '20px', borderRadius: '8px' },
  
  // LADO ESQUERDO
  leftSide: { flex: '1.5' },
  containerVisualizacao: { display: 'flex', gap: '15px' },
  sidebarFotos: { display: 'flex', flexDirection: 'column', gap: '10px' },
  miniCard: { width: '80px', height: '80px', border: '2px solid', borderRadius: '4px', cursor: 'pointer', overflow: 'hidden' },
  miniImg: { width: '100%', height: '100%', objectFit: 'cover' },
  imgPrincipalContainer: { flex: 1, aspectRatio: '1/1', border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' },
  mainImg: { width: '100%', height: '100%', objectFit: 'contain' },

  // LADO DIREITO
  rightSide: { flex: '1' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '10px' },
  priceBox: { background: '#fef4f2', padding: '15px', borderRadius: '6px', marginBottom: '20px' },
  labelPreco: { fontSize: '12px', color: '#888' },
  price: { fontSize: '30px', color: '#ee4d2d', fontWeight: 'bold' },

  section: { marginBottom: '25px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '10px', display: 'block' },
  
  gridCores: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  cardCor: { width: '50px', height: '50px', border: '2px solid', borderRadius: '4px', cursor: 'pointer', position: 'relative' },
  imgCardCor: { width: '100%', height: '100%', objectFit: 'cover' },
  check: { position: 'absolute', top: -4, right: -4, background: '#ee4d2d', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  boxSelecao: { marginBottom: '25px' },
  gridTamanhos: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  sizeBtn: { padding: '10px 20px', border: '1px solid', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },

  btnComprar: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }
};