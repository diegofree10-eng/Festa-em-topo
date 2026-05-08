"use client";

import { useCart } from "@/app/context/CartContext";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment, getDoc, addDoc, collection } from "firebase/firestore";

// --- FUNÇÕES DE APOIO ---
const validarCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let cpfs = cpf.split('').map(el => +el);
  const rest = (count) => (cpfs.slice(0, count - 12).reduce((sma, el, idx) => sma + el * (count - idx), 0) * 10) % 11 % 10;
  return rest(10) === cpfs[9] && rest(11) === cpfs[10];
};

const consolidarPacote = (itens) => {
  let pesoTotal = 0; let alturaAcumulada = 0; let larguraMax = 0; let comprimentoMax = 0;
  itens.forEach(item => {
    const qtd = item.qty || 1;
    let pesoUnitario = Number(item.peso) || 0.03;
    if (pesoUnitario >= 1) pesoUnitario = pesoUnitario / 1000; 
    pesoTotal += pesoUnitario * qtd;
    alturaAcumulada += (Number(item.altura) || 0.3) * qtd;
    larguraMax = Math.max(larguraMax, Number(item.largura) || 22);
    comprimentoMax = Math.max(comprimentoMax, Number(item.comprimento) || 33);
  });
  let medidas = [Math.max(22, larguraMax), Math.max(33, comprimentoMax), Math.ceil(alturaAcumulada)];
  medidas.sort((a, b) => a - b);
  return { 
    peso: Number(pesoTotal.toFixed(3)), 
    altura: Math.min(25, Math.max(4, medidas[0])), 
    largura: Math.max(11, medidas[1]), 
    comprimento: Math.max(16, medidas[2]) 
  };
};

export default function Carrinho() {
  const { cart, addToCart, decrease, removeFromCart, clearCart } = useCart();
  const router = useRouter();
  const params = useParams();
  
  const lojistaId = cart[0]?.lojistaId || params.lojistaId; 

  const [dadosLoja, setDadosLoja] = useState({ 
    cep: "", 
    cidade: "", 
    chavePix: "", 
    aberta: true,
    transportadoras: {},
    whatsapp: "",
    banner: "", // Banner do lojista
    cupons: {}  // Cupons configurados
  });
  
  const [nomeCliente, setNomeCliente] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState(""); 
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  
  const [nomeCrianca, setNomeCrianca] = useState("");
  const [idadeCrianca, setIdadeCrianca] = useState("");

  const [opcoesFrete, setOpcoesFrete] = useState([]);
  const [freteSelecionado, setFreteSelecionado] = useState(null);
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  // Estados do Cupom
  const [cupomInput, setCupomInput] = useState("");
  const [descontoAtivo, setDescontoAtivo] = useState(0);
  const [cupomAplicado, setCupomAplicado] = useState(null);

  const itensFisicos = useMemo(() => cart.filter(item => !(item.nome || "").toLowerCase().includes("digital")), [cart]);
  const isCarrinhoApenasDigital = useMemo(() => cart.length > 0 && itensFisicos.length === 0, [cart, itensFisicos]);
  const temKitFesta = useMemo(() => cart.some(item => (item.nome || "").toLowerCase().includes("kit festa")), [cart]);
  
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.preco || 0) * item.qty), 0), [cart]);
  const valorFreteFinal = useMemo(() => Number(freteSelecionado?.price || 0), [freteSelecionado]);
  const totalGeral = (subtotal - descontoAtivo) + valorFreteFinal;

  useEffect(() => {
    if (lojistaId) {
      const unsub = onSnapshot(doc(db, "lojistas", lojistaId), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setDadosLoja({
            cep: d.cep || "", 
            cidade: d.cidade || "", 
            chavePix: d.chavePix || "", 
            aberta: d.ativo ?? true,
            transportadoras: d.transportadoras || {},
            whatsapp: d.whatsapp || "",
            banner: d.bannerImg || d.banner || "", // Ajuste conforme seu campo no Firebase
            cupons: d.cupons || {}
          });
        }
      });
      return () => unsub();
    }
  }, [lojistaId]);

  useEffect(() => {
    if (isCarrinhoApenasDigital) {
      const optDigital = { id: 'digital', name: 'Envio Digital (E-mail/WhatsApp)', price: 0, company: { name: 'Festa em Topo' } };
      setOpcoesFrete([optDigital]); 
      setFreteSelecionado(optDigital); 
    } else if (cep.length === 8) {
      processarEntrega();
    }
  }, [cep, isCarrinhoApenasDigital, dadosLoja.transportadoras]);

  async function processarEntrega() {
    setCalculandoFrete(true);
    setErro("");
    try {
      const resCli = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dataCli = await resCli.json();
      if (dataCli.erro) { setErro("CEP não encontrado."); return; }
      
      setRua(dataCli.logradouro); setBairro(dataCli.bairro); setCidade(dataCli.localidade); setUf(dataCli.uf);

      const resJad = await fetch("/api/frete/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cepDestino: cep.replace(/\D/g, ""),
          pacote: consolidarPacote(itensFisicos),
          lojistaId: lojistaId 
        })
      });
      
      const dataJad = await resJad.json();
      let transportadorasFinal = [];

      if (resJad.ok && Array.isArray(dataJad)) {
        transportadorasFinal = dataJad.filter(opt => {
          const nomeApi = opt.company?.name.toLowerCase();
          const tPermitidas = dadosLoja.transportadoras;
          if (nomeApi.includes("jadlog") && tPermitidas.jadlog === true) return true;
          if (nomeApi.includes("correios") && tPermitidas.correios === true) return true;
          if (nomeApi.includes("azul") && tPermitidas.azul === true) return true;
          if (nomeApi.includes("latam") && tPermitidas.latam === true) return true;
          return false;
        });
      }

      // AJUSTE: Adiciona Retirada na Loja junto com as outras se for a mesma cidade
      const cidadeCliente = dataCli.localidade.toLowerCase().trim();
      const cidadeLoja = dadosLoja.cidade.toLowerCase().trim();

      if (cidadeCliente === cidadeLoja) {
        const opcaoRetirada = { id: 'retirada', name: 'Retirar na Loja', price: 0, company: { name: 'Festa em Topo' } };
        const listaFinal = [opcaoRetirada, ...transportadorasFinal];
        setOpcoesFrete(listaFinal);
        setFreteSelecionado(opcaoRetirada);
      } else {
        setOpcoesFrete(transportadorasFinal);
        if (transportadorasFinal.length > 0) setFreteSelecionado(transportadorasFinal[0]);
      }
    } catch (e) { setErro("Erro ao calcular frete."); } finally { setCalculandoFrete(false); }
  }

  function aplicarCupom() {
    const cupom = cupomInput.trim().toUpperCase();
    if (!cupom) return;

    const infoCupom = dadosLoja.cupons[cupom];
    if (infoCupom && infoCupom.ativo) {
      let vDesconto = 0;
      if (infoCupom.tipo === "fixo") vDesconto = Number(infoCupom.valor);
      if (infoCupom.tipo === "porcentagem") vDesconto = subtotal * (Number(infoCupom.valor) / 100);
      
      setDescontoAtivo(vDesconto);
      setCupomAplicado(cupom);
      setErro("");
    } else {
      setErro("❌ Cupom inválido ou expirado.");
      setDescontoAtivo(0);
      setCupomAplicado(null);
    }
  }

  const pixPayload = useMemo(() => {
    if (!dadosLoja.chavePix || totalGeral <= 0) return "";
    const v = totalGeral.toFixed(2);
    const f = (id, val) => id + String(val.length).padStart(2, "0") + val;
    let p = f("00", "01") + f("26", f("00", "br.gov.bcb.pix") + f("01", dadosLoja.chavePix)) + f("52", "0000") + f("53", "986") + f("54", v) + f("58", "BR") + f("59", "FESTA EM TOPO") + f("60", "SJC") + f("62", f("05", "***")) + "6304"; 
    const crc16 = (s) => {
      let c = 0xFFFF;
      for (let i = 0; i < s.length; i++) {
        c ^= s.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) { if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; else c <<= 1; }
      }
      return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    };
    return p + crc16(p);
  }, [dadosLoja.chavePix, totalGeral]);

  async function enviarWhatsApp() {
    if (!nomeCliente.trim() || !validarCPF(cpf)) { setErro("⚠️ Nome ou CPF inválido."); return; }
    if (temKitFesta && (!nomeCrianca.trim() || !idadeCrianca.trim())) { setErro("⚠️ Informe Nome e Idade para o Kit Festa."); return; }
    if (!isCarrinhoApenasDigital && (!rua.trim() || !freteSelecionado)) { setErro("⚠️ Preencha endereço e frete."); return; }
    if (!dadosLoja.whatsapp) { setErro("⚠️ Erro: WhatsApp do lojista não configurado."); return; }

    setCarregando(true);
    try {
      const pedidosRef = doc(db, "config", "pedidos");
      await updateDoc(pedidosRef, { contador: increment(1) });
      const snap = await getDoc(pedidosRef);
      const n = snap.data()?.contador || 0;

      const orderData = {
        numeroPedido: n,
        cliente: nomeCliente,
        cpf,
        data: new Date().toLocaleString("pt-BR"),
        itens: cart.map(i => ({ nome: i.nome, qty: i.qty, preco: i.preco, variacao: i.variacao || "Padrão" })),
        personalizacao: temKitFesta ? { nome: nomeCrianca, idade: idadeCrianca } : null,
        financeiro: { subtotal, desconto: descontoAtivo, cupom: cupomAplicado, frete: valorFreteFinal, total: totalGeral, metodo: freteSelecionado.name },
        endereco: isCarrinhoApenasDigital ? "Digital" : { rua, numero, bairro, cidade, uf, cep },
        lojistaId,
        status: "Pendente"
      };

      await addDoc(collection(db, "registros_pedidos"), orderData);

      let msgItens = cart.map(i => `• ${i.qty}x ${i.nome} ${i.variacao ? `[${i.variacao}]` : ""}`).join("%0A");
      let msgEnd = isCarrinhoApenasDigital ? "📦 *Entrega:* Digital" : `📍 *Entrega:* ${rua}, ${numero} (${freteSelecionado.name})`;
      let msgPerso = temKitFesta ? `%0A📝 *Personalização:* ${nomeCrianca} - ${idadeCrianca} anos` : "";
      let msgCupom = cupomAplicado ? `%0A🎟️ *Cupom:* ${cupomAplicado} (-R$ ${descontoAtivo.toFixed(2)})` : "";

      const msgFinal = `🛒 *PEDIDO Nº ${n}*%0A%0A👤 *Cliente:* ${nomeCliente}%0A🆔 *CPF:* ${cpf}%0A%0A📦 *Produtos:*%0A${msgItens}${msgPerso}${msgCupom}%0A%0A${msgEnd}%0A💰 *FRETE:* R$ ${valorFreteFinal.toFixed(2)}%0A🚀 *TOTAL: R$ ${totalGeral.toFixed(2).replace(".", ",")}*`;
      
      const foneLimpo = dadosLoja.whatsapp.replace(/\D/g, "");
      const link = `https://wa.me/${foneLimpo.startsWith("55") ? foneLimpo : "55" + foneLimpo}?text=${msgFinal}`;
      
      window.open(link, "_blank");
      setPedidoEnviado(true);
      setErro("");
    } catch (e) { setErro("Erro ao registrar pedido."); } finally { setCarregando(false); }
  }

  return (
    <div style={styles.page}>
      {/* Banner de Identidade Visual */}
      <div style={{...styles.bannerContainer, backgroundImage: `url(${dadosLoja.banner || 'https://via.placeholder.com/1200x200?text=Sua+Loja'})`}}>
          <div style={styles.bannerOverlay}>
            <h1 style={{margin: 0, color: '#fff'}}>🛒 Finalizar Compra</h1>
          </div>
      </div>

      <div style={styles.container}>
        <div style={styles.left}>
          {cart.map((item, i) => (
            <div key={i} style={styles.item}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0}}>{item.nome} {item.variacao && <small style={{color: '#666'}}>({item.variacao})</small>}</h3>
                {item.nome.toLowerCase().includes("digital") && <span style={styles.tagDigital}>DIGITAL</span>}
              </div>
              <p style={{fontWeight: 'bold', margin: '5px 0'}}>R$ {Number(item.preco).toFixed(2).replace(".", ",")}</p>
              <div style={styles.qtyBox}>
                <button onClick={() => decrease(item.id, item.variacao)} style={styles.qtyBtn}>-</button>
                <span style={{fontWeight: 'bold'}}>{item.qty}</span>
                <button onClick={() => addToCart(item)} style={styles.qtyBtn}>+</button>
                <button onClick={() => removeFromCart(item.id, item.variacao)} style={styles.removeBtn}>remover</button>
              </div>
            </div>
          ))}

          <div style={styles.section}>
              <h3 style={{marginTop: 0}}>👤 Seus Dados</h3>
              <input placeholder="Nome Completo *" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} style={styles.input} />
              <input placeholder="CPF (Somente números) *" value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))} maxLength={11} style={styles.input} />
              
              {temKitFesta && (
                <div style={styles.kitFestaBox}>
                  <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#b45309'}}>🎨 Personalização Kit Festa:</p>
                  <div style={{display: 'flex', gap: 10}}>
                     <input placeholder="Nome da criança *" value={nomeCrianca} onChange={(e) => setNomeCrianca(e.target.value)} style={styles.input} />
                     <input placeholder="Idade *" value={idadeCrianca} onChange={(e) => setIdadeCrianca(e.target.value)} style={{...styles.input, width: '100px'}} />
                  </div>
                </div>
              )}

              {!isCarrinhoApenasDigital && (
                <div style={{marginTop: 20}}>
                  <h3 style={{marginBottom: 10}}>📍 Endereço de Entrega</h3>
                  <input placeholder="CEP *" value={cep} onChange={(e) => setCep(e.target.value.replace(/\D/g, ""))} maxLength={8} style={styles.input} />
                  <div style={{display: 'flex', gap: 10}}>
                    <input placeholder="Rua *" value={rua} onChange={(e) => setRua(e.target.value)} style={{...styles.input, flex: 3}} />
                    <input placeholder="Nº *" value={numero} onChange={(e) => setNumero(e.target.value)} style={{...styles.input, flex: 1}} />
                  </div>
                  <div style={{display: 'flex', gap: 10}}>
                     <input placeholder="Cidade" value={cidade} readOnly style={{...styles.input, flex: 3, background: '#f9f9f9'}} />
                     <input placeholder="UF" value={uf} readOnly style={{...styles.input, flex: 1, background: '#f9f9f9'}} />
                  </div>
                </div>
              )}
          </div>
        </div>

        <div style={styles.right}>
          <h3 style={{marginTop: 0}}>💳 Pagamento PIX</h3>
          {pixPayload ? (
            <div style={styles.qrBox}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} style={styles.qr} alt="Pix" />
              <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(pixPayload); alert("Código PIX copiado!"); }}>Copiar Código PIX</button>
            </div>
          ) : <p style={{fontSize: '12px', color: '#999'}}>Aguardando dados...</p>}

          {/* Caixa de Cupom */}
          <div style={styles.couponBox}>
             <input 
               placeholder="Cupom de desconto" 
               value={cupomInput} 
               onChange={(e) => setCupomInput(e.target.value)} 
               style={styles.couponInput} 
             />
             <button onClick={aplicarCupom} style={styles.couponBtn}>Aplicar</button>
          </div>

          <div style={styles.freteContainerRight}>
            <h4 style={{margin: '0 0 10px 0'}}>🚚 Opções de Frete</h4>
            {isCarrinhoApenasDigital ? (
              <div style={{...styles.freteCard, borderColor: '#2ecc71', background: '#f0fdf4'}}>
                <span style={{fontSize: '12px', fontWeight: 'bold'}}>ENVIO DIGITAL</span><br/>
                <b style={{color: '#2ecc71'}}>Grátis</b>
              </div>
            ) : cep.length < 8 ? (
              <p style={{fontSize: '12px', color: '#666'}}>Informe o CEP para ver o frete</p>
            ) : calculandoFrete ? (
              <p style={{fontSize: '12px'}}>🔄 Calculando...</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {opcoesFrete.length > 0 ? opcoesFrete.map(opt => (
                  <div key={opt.id} onClick={() => setFreteSelecionado(opt)} 
                       style={{
                         ...styles.freteCard, 
                         borderColor: freteSelecionado?.id === opt.id ? '#2ecc71' : '#ddd', 
                         background: freteSelecionado?.id === opt.id ? '#f0fdf4' : '#fff'
                       }}>
                    <div style={{fontSize: '11px', fontWeight: 'bold'}}>{opt.name}</div>
                    <div style={{color: opt.price === 0 ? '#2ecc71' : '#333', fontSize: '14px', fontWeight: 'bold'}}>
                      {opt.price === 0 ? "Grátis" : `R$ ${Number(opt.price).toFixed(2).replace(".", ",")}`}
                    </div>
                  </div>
                )) : <p style={{fontSize: '11px', color: '#e74c3c'}}>Opções indisponíveis.</p>}
              </div>
            )}
          </div>

          <div style={styles.resumoFinal}>
            <div style={styles.resumoRow}><span>Subtotal:</span> <b>R$ {subtotal.toFixed(2)}</b></div>
            {descontoAtivo > 0 && (
              <div style={{...styles.resumoRow, color: '#e74c3c'}}>
                <span>Desconto ({cupomAplicado}):</span> <b>- R$ {descontoAtivo.toFixed(2)}</b>
              </div>
            )}
            <div style={styles.resumoRow}><span>Frete:</span> <b>{valorFreteFinal === 0 ? "Grátis" : `R$ ${valorFreteFinal.toFixed(2)}`}</b></div>
            <div style={{...styles.resumoRow, fontSize: '20px', marginTop: 15, borderTop: '2px solid #eee', paddingTop: 10}}>
              <span>TOTAL:</span> <b style={{color: '#2ecc71'}}>R$ {totalGeral.toFixed(2).replace(".", ",")}</b>
            </div>
          </div>
          
          {erro && <div style={styles.errorBox}>{erro}</div>}

          {!pedidoEnviado ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={enviarWhatsApp} disabled={!dadosLoja.aberta || carregando} 
                      style={{...styles.whatsBtn, background: dadosLoja.aberta ? "#25D366" : "#ccc"}}>
                {carregando ? "Processando..." : "1. Enviar Pedido no WhatsApp"}
              </button>
              
              <button onClick={() => router.push(`/${lojistaId}`)} style={styles.continueBtn}>
                ← Continuar Comprando
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={styles.successAlert}>
                ✅ Pedido enviado! Agora escaneie o QR Code acima para pagar.
              </div>

              <button onClick={() => router.push(`/${lojistaId}`)} style={styles.continueBtn}>
                ← Continuar Comprando
              </button>

              <button onClick={() => { clearCart(); router.push("/obrigado"); }} style={{...styles.whatsBtn, background: "#3498db"}}>
                2. Já paguei o PIX e quero finalizar
              </button>
              
              <button onClick={() => setPedidoEnviado(false)} style={styles.backBtn}>
                Alterar dados do pedido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#f5f7fb", minHeight: "100vh", fontFamily: "sans-serif" },
  bannerContainer: { width: '100%', height: '180px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', padding: '0 40px' },
  container: { display: "flex", gap: 20, flexWrap: "wrap", padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  left: { flex: 2, minWidth: 320 },
  right: { flex: 1, minWidth: 300, background: "#fff", padding: 20, borderRadius: 12, height: 'fit-content', boxShadow: "0 4px 15px rgba(0,0,0,0.08)", position: 'sticky', top: 20 },
  section: { background: '#fff', padding: 20, borderRadius: 10, boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  item: { background: "#fff", padding: 15, borderRadius: 10, marginBottom: 10, border: '1px solid #eee' },
  qtyBox: { display: "flex", alignItems: "center", gap: 10 },
  qtyBtn: { width: 32, height: 32, background: "#2ecc71", color: "#fff", border: "none", borderRadius: 6, cursor: 'pointer', fontSize: '18px' },
  removeBtn: { background: "#ff4d4d", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: 'pointer', fontSize: '11px', marginLeft: 'auto' },
  input: { width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #ddd", boxSizing: 'border-box' },
  couponBox: { display: 'flex', gap: 5, marginBottom: 15 },
  couponInput: { flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd' },
  couponBtn: { padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' },
  kitFestaBox: { marginTop: 15, padding: 15, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' },
  freteContainerRight: { marginTop: 10, padding: 15, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' },
  freteCard: { padding: 10, border: '2px solid', borderRadius: 8, cursor: 'pointer', textAlign: 'center' },
  qrBox: { background: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 15, textAlign: 'center' },
  qr: { width: 140, height: 140, display: 'block', margin: '0 auto 10px' },
  copyBtn: { width: "100%", padding: 10, background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: 'pointer', fontSize: '12px' },
  resumoFinal: { margin: '20px 0' },
  resumoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 },
  whatsBtn: { width: "100%", padding: 16, color: "#fff", border: "none", borderRadius: 10, fontWeight: "bold", cursor: 'pointer', fontSize: '16px' },
  continueBtn: { width: "100%", background: "#fff", color: "#3498db", border: "2px solid #3498db", padding: "14px", borderRadius: 10, cursor: 'pointer', fontWeight: 'bold' },
  errorBox: { background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: '14px', textAlign: 'center' },
  successAlert: { background: '#f0fdf4', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', textAlign: 'center', border: '1px solid #bbf7d0' },
  backBtn: { background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', textAlign: 'center' },
  tagDigital: { background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }
};