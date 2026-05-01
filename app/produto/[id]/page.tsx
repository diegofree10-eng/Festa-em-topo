"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProdutoFinal() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [p, setP] = useState<any>(null);
  const [img, setImg] = useState("");
  const [sel, setSel] = useState<any>(null);
  const [loja, setLoja] = useState<any>(null);

  useEffect(() => {
    async function carregar() {
      const lojaID = searchParams.get("loja");
      const produtoID = params.id as string;
      if (!produtoID || !lojaID) return;

      try {
        const pRef = doc(db, "lojistas", lojaID, "produtos", produtoID);
        const lRef = doc(db, "lojistas", lojaID);
        const [pS, lS] = await Promise.all([getDoc(pRef), getDoc(lRef)]);

        if (pS.exists()) {
          const d = pS.data();
          setP(d);
          setImg(d.capa || d.imagens?.[0]);
          if (d.variacoes?.length > 0) setSel(d.variacoes[0]);
        }
        if (lS.exists()) setLoja(lS.data());
      } catch (e) { console.error(e); }
    }
    carregar();
  }, [params.id, searchParams]);

  if (!p) return null;

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.nav}>
          <img src={loja?.logo || "/logo.png"} style={s.logo} />
          <span style={s.brand}>{loja?.nomeFantasia?.toUpperCase() || "LOJA"}</span>
        </div>
      </header>

      <main style={s.main}>
        {/* LADO ESQUERDO: GALERIA COMPACTA */}
        <div style={s.left}>
          <div style={s.imgCard}>
            <img src={img} style={s.mainImg} />
          </div>
          <div style={s.grid}>
            {p.imagens?.map((url: string, i: number) => (
              <div key={i} onClick={() => setImg(url)} style={{...s.thumb, border: img === url ? '2px solid #48b4f3' : '1px solid #ddd'}}>
                <img src={url} style={s.thumbImg} />
              </div>
            ))}
          </div>
        </div>

        {/* LADO DIREITO: INFOS */}
        <div style={s.right}>
          <h1 style={s.title}>{p.nome}</h1>
          <div style={s.price}>R$ {sel?.preco || p.precoBasico}</div>
          
          <div style={s.sep} />

          {p.variacoes?.length > 0 && (
            <div style={s.box}>
              <label style={s.label}>{p.nomeVariacaoPrincipal || "VARIAÇÕES"}</label>
              <div style={s.btns}>
                {p.variacoes.map((v: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setSel(v)} 
                    style={{...s.vBtn, background: sel?.nome === v.nome ? '#000' : '#fff', color: sel?.nome === v.nome ? '#fff' : '#000'}}
                  >
                    {v.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={s.box}>
            <label style={s.label}>DESCRIÇÃO</label>
            <p style={s.text}>{p.descricao}</p>
          </div>

          <button style={s.buy}>ADICIONAR AO CARRINHO</button>
        </div>
      </main>
    </div>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  container: { background: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', color: '#000' },
  header: { background: '#48b4f3', padding: '15px 0', borderBottom: '1px solid #ddd' },
  nav: { maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px' },
  logo: { width: '32px', height: '32px', borderRadius: '50%', background: '#fff' },
  brand: { color: '#fff', fontWeight: 'bold', fontSize: '14px' },

  main: { maxWidth: '900px', margin: '40px auto', display: 'flex', flexWrap: 'wrap', gap: '40px', padding: '0 20px' },
  
  // QUADRO DA IMAGEM REDUZIDO (320px)
  left: { flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '12px' },
  imgCard: { width: '320px', height: '320px', background: '#fcfcfc', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mainImg: { maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  thumb: { aspectRatio: '1/1', cursor: 'pointer', background: '#fff', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },

  right: { flex: '1', minWidth: '300px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' },
  price: { fontSize: '26px', fontWeight: 'bold', color: '#e63946' },
  sep: { height: '1px', background: '#eee', margin: '20px 0' },

  box: { marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#999', marginBottom: '8px', display: 'block' },
  btns: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  vBtn: { padding: '8px 14px', border: '1px solid #333', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  text: { fontSize: '14px', lineHeight: '1.6', color: '#444' },

  buy: { width: '100%', padding: '18px', background: '#000', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }
};