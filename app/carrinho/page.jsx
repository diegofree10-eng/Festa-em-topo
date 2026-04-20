"use client";

import { useCart } from "@/app/context/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment, getDoc, addDoc, collection } from "firebase/firestore";

export default function Carrinho() {
  const { cart, addToCart, decrease, removeFromCart, totalCarrinho, clearCart } = useCart();
  const router = useRouter();

  const [frete, setFrete] = useState(0);
  const [chavePix, setChavePix] = useState("");
  const [lojaAberta, setLojaAberta] = useState(true);
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomePersonalizado, setNomePersonalizado] = useState("");
  const [idade, setIdade] = useState("");
  
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade] = useState("São José dos Campos");
  const [uf] = useState("SP");

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(null); // Para manter o QR Code visível

  const whatsapp = "5512981654900"; 

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        setFrete(Number(dados.frete) || 0);
        setChavePix(dados.chavePix || "");
        setLojaAberta(dados.lojaAberta ?? true);
      }
    });
    return () => unsub();
  }, []);

  const subtotal = totalCarrinho;
  const freteReais = frete / 100; 
  const totalGeral = subtotal + freteReais;

  const pixPayload = (() => {
    if (!chavePix) return "";
    const v = totalGeral.toFixed(2);
    const f = (id, val) => id + String(val.length).padStart(2, "0") + val;
    let payload = f("00", "01") + f("26", f("00", "br.gov.bcb.pix") + f("01", chavePix)) + 
                  f("52", "0000") + f("53", "986") + f("54", v) + f("58", "BR") + 
                  f("59", "LOJA") + f("60", "CIDADE") + f("62", f("05", "***")) + "6304"; 

    const crc16 = (s) => {
      let c = 0xFFFF;
      for (let i = 0; i < s.length; i++) {
        c ^= s.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; else c <<= 1;
        }
      }
      return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    };
    return payload + crc16(payload);
  })();

  const isKitFesta = cart.some((item) =>
    (item.nome || "").toLowerCase().includes("kit festa")
  );

  function validar() {
    if (!lojaAberta) { setErro("🔴 Loja em recesso. Pedidos desativados."); return false; }
    if (cart.length === 0) { setErro("⚠️ Carrinho vazio"); return false; }
    if (!nomeCliente.trim()) { setErro("⚠️ Preencha o NOME DO CLIENTE"); return false; }
    if (!rua.trim() || !numero.trim() || !bairro.trim()) { 
      setErro("⚠️ Preencha os dados de ENDEREÇO (Rua, Nº e Bairro)"); 
      return false; 
    }
    if (isKitFesta) {
      if (!nomePersonalizado.trim()) { setErro("⚠️ Preencha o NOME para personalização"); return false; }
      if (!idade.trim()) { setErro("⚠️ Preencha a IDADE"); return false; }
    }
    setErro("");
    return true;
  }

  async function enviar() {
    if (!validar()) return;
    setCarregando(true);
    try {
      const pedidosRef = doc(db, "config", "pedidos");
      await updateDoc(pedidosRef, { contador: increment(1) });
      const snap = await getDoc(pedidosRef);
      const numeroPedido = snap.data()?.contador || 0;

      await addDoc(collection(db, "registros_pedidos"), {
        numeroPedido,
        cliente: nomeCliente,
        endereco: { rua, numero, bairro, cidade, uf },
        data: new Date().toLocaleString("pt-BR"),
        itens: cart.map(item => ({ nome: item.nome, qty: item.qty, preco: item.preco, variacao: item.variacao })),
        financeiro: { subtotal, frete: freteReais, total: totalGeral },
        personalizacao: isKitFesta ? { nome: nomePersonalizado, idade } : "N/A",
        status: "Pendente"
      });

      let msg = `🛒 *PEDIDO Nº ${numeroPedido}*%0A%0A👤 Cliente: ${nomeCliente}%0A📍 Endereço: ${rua}, ${numero} - ${bairro}%0A🏙️ ${cidade}-${uf}%0A`;
      if (isKitFesta) msg += `🎁 Personalização: ${nomePersonalizado}%0A🎉 Idade: ${idade}%0A`;
      msg += `%0A📦 *Itens:*%0A`;
      cart.forEach(item => { 
        const precoFormatado = String(item.preco).replace(".", ",");
        msg += `- ${item.nome} (${item.variacao || 'Padrão'}) x${item.qty} = R$ ${precoFormatado}%0A`; 
      });
      msg += `%0A🚚 Frete: R$ ${freteReais.toFixed(2).replace(".", ",")}%0A💰 *Total: R$ ${totalGeral.toFixed(2).replace(".", ",")}*%0A%0A📎 *ENVIANDO COMPROVANTE DO PIX...*`;
      
      const whatsappUrl = `https://wa.me/${whatsapp}?text=${msg}`;
      
      // Armazena o link mas não limpa o carrinho imediatamente para o QR Code não sumir
      setPedidoFinalizado(whatsappUrl);
      window.open(whatsappUrl, "_blank");

    } catch (e) { 
      setErro("⚠️ Erro ao processar o pedido."); 
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1>🛒 Carrinho</h1>
      <button onClick={() => router.push("/")} style={styles.continueBtn}>← Continuar comprando</button>

      <div style={styles.freteWarning}>
        📢 <strong>IMPORTANTE:</strong> O frete cobrado é válido apenas para a cidade de <strong>São José dos Campos-SP</strong>.
      </div>

      <div style={styles.container}>
        <div style={styles.left}>
          {cart.map((item, i) => (
            <div key={item.id + (item.variacao || i)} style={styles.item}>
              <h3>{item.nome} {item.variacao && <span style={{fontSize: '12px', color: '#666'}}>({item.variacao})</span>}</h3>
              <p>R$ {String(item.preco).replace(".", ",")}</p>
              <div style={styles.qtyBox}>
                <button onClick={() => decrease(item.id, item.variacao)} style={styles.qtyBtn}>-</button>
                <span style={{ fontWeight: "bold", width: 20, textAlign: "center" }}>{item.qty}</span>
                <button onClick={() => addToCart(item)} style={styles.qtyBtn}>+</button>
                <button onClick={() => removeFromCart(item.id, item.variacao)} style={styles.removeBtn}>remover</button>
              </div>
            </div>
          ))}

          <h2>Subtotal: R$ {subtotal.toFixed(2).replace(".", ",")}</h2>
          <div style={styles.freteBox}>🚚 Frete (SJC): R$ {freteReais.toFixed(2).replace(".", ",")}</div>
          <h2 style={{ color: "#2ecc71" }}>Total: R$ {totalGeral.toFixed(2).replace(".", ",")}</h2>

          {erro && <div style={styles.errorBox}>{erro}</div>}
          
          <div style={{marginTop: 20}}>
            <h3 style={{fontSize: '16px', marginBottom: '10px'}}>📍 Dados de Entrega</h3>
            <input 
              disabled={!lojaAberta || !!pedidoFinalizado}
              placeholder="Nome do cliente *" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)} 
              style={{...styles.input, opacity: lojaAberta ? 1 : 0.6}} 
            />
            <div style={{display: 'flex', gap: 10}}>
                <input disabled={!lojaAberta || !!pedidoFinalizado} placeholder="Rua / Avenida *" value={rua} onChange={(e) => setRua(e.target.value)} style={{...styles.input, flex: 3}} />
                <input disabled={!lojaAberta || !!pedidoFinalizado} placeholder="Nº *" value={numero} onChange={(e) => setNumero(e.target.value)} style={{...styles.input, flex: 1}} />
            </div>
            <input disabled={!lojaAberta || !!pedidoFinalizado} placeholder="Bairro *" value={bairro} onChange={(e) => setBairro(e.target.value)} style={styles.input} />
            <div style={{display: 'flex', gap: 10}}>
                <input disabled placeholder="Cidade" value={cidade} style={{...styles.input, background: '#eee', flex: 3}} />
                <input disabled placeholder="UF" value={uf} style={{...styles.input, background: '#eee', flex: 1}} />
            </div>
          </div>

          {isKitFesta && (
            <div style={{marginTop: 20}}>
              <div style={styles.alert}>⚠️ Dados de Personalização Obrigatórios</div>
              <input disabled={!lojaAberta || !!pedidoFinalizado} placeholder="Nome para personalização *" value={nomePersonalizado} onChange={(e) => setNomePersonalizado(e.target.value)} style={{...styles.input, opacity: lojaAberta ? 1 : 0.6}} />
              <input disabled={!lojaAberta || !!pedidoFinalizado} placeholder="Idade *" value={idade} onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))} style={{...styles.input, opacity: lojaAberta ? 1 : 0.6}} />
            </div>
          )}
        </div>

        <div style={styles.right}>
          <h3>💳 Pagamento PIX</h3>
          <p style={{fontSize: '11px', color: '#666', marginBottom: 10}}>Pague agora para liberar o botão</p>
          
          {chavePix ? (
            <img 
              key={totalGeral + chavePix} 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
              style={styles.qr} 
              alt="Pix" 
            />
          ) : (
            <div style={{...styles.qr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'}}>Carregando PIX...</div>
          )}
          
          <div style={styles.pixKey}>{chavePix || "Carregando chave..."}</div>
          <button 
            style={styles.copyBtn} 
            onClick={() => { navigator.clipboard.writeText(pixPayload); alert("Código PIX Copiado!"); }}
          >
            Copiar código Pix
          </button>
          
          {pedidoFinalizado ? (
            <div style={{marginTop: 10}}>
                <button 
                  onClick={() => window.open(pedidoFinalizado, "_blank")}
                  style={{...styles.whatsBtn, background: "#25D366"}}
                >
                  Abrir WhatsApp Novamente
                </button>
                <button 
                  onClick={() => { clearCart(); router.push("/"); }}
                  style={{...styles.continueBtn, width: '100%', marginTop: 10, background: '#666'}}
                >
                  Finalizar e Sair
                </button>
            </div>
          ) : (
            <button 
              onClick={enviar} 
              disabled={!lojaAberta || carregando} 
              style={{
                ...styles.whatsBtn,
                background: lojaAberta ? "#25D366" : "#94a3b8",
                cursor: lojaAberta ? "pointer" : "not-allowed"
              }}
            >
              {carregando ? "Processando..." : lojaAberta ? "Confirmar e Enviar Comprovante" : "Loja em Recesso"}
            </button>
          )}
          
          <div style={styles.notice}>
            {lojaAberta 
              ? "✅ O endereço e o pedido serão enviados automaticamente no chat após clicar no botão acima."
              : "🚩 Estamos em recesso no momento."
            }
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 20, background: "#f5f7fb", minHeight: "100vh", fontFamily: "sans-serif" },
  freteWarning: { background: "#ff7675", color: "#fff", padding: "12px", borderRadius: "10px", marginBottom: "20px", textAlign: "center", fontSize: "14px", fontWeight: "bold", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" },
  container: { display: "flex", gap: 20, flexWrap: "wrap" },
  left: { flex: 2, minWidth: 300 },
  right: { flex: 1, minWidth: 260, background: "#fff", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 5px 15px rgba(0,0,0,0.08)", position: 'sticky', top: 20, height: 'fit-content' },
  item: { background: "#fff", padding: 10, borderRadius: 10, marginBottom: 10 },
  qtyBox: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  qtyBtn: { width: 28, height: 28, background: "#2ecc71", border: "none", color: "#fff", borderRadius: 6, cursor: "pointer" },
  removeBtn: { marginLeft: 10, background: "#e74c3c", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer" },
  freteBox: { marginTop: 10, padding: 10, background: "#ecf0f1", borderRadius: 8, fontWeight: "bold" },
  input: { width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
  alert: { marginTop: 10, background: "#f31212", color: "#fff", padding: 10, borderRadius: 10, fontSize: 12 },
  errorBox: { marginTop: 10, background: "#e74c3c", color: "#fff", padding: 10, borderRadius: 10, fontWeight: "bold", marginBottom: 15 },
  qr: { width: 160, height: 160, margin: "10px auto", border: '1px solid #eee' },
  pixKey: { fontSize: 12, background: "#f1f1f1", padding: 8, borderRadius: 8, wordBreak: "break-word", marginBottom: 10 },
  copyBtn: { width: "100%", marginBottom: 10, padding: 10, background: "#3498db", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 'bold' },
  whatsBtn: { width: "100%", marginTop: 10, padding: 18, color: "#fff", border: "none", borderRadius: 10, fontWeight: "bold", fontSize: "15px", transition: "0.3s", boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)" },
  continueBtn: { marginBottom: 15, background: "#3498db", color: "#fff", border: "none", padding: 10, borderRadius: 8, cursor: "pointer" },
  notice: { marginTop: 15, background: "#ffeaa7", padding: 12, borderRadius: 10, fontSize: 12, color: '#d63031', fontWeight: '500' }
};