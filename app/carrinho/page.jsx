"use client";

import { useCart } from "@/app/context/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function Carrinho() {
  const { cart, addToCart, decrease, removeFromCart } = useCart();
  const router = useRouter();

  const [frete, setFrete] = useState(0);

  const [nomeCliente, setNomeCliente] = useState("");
  const [nomePersonalizado, setNomePersonalizado] = useState("");
  const [idade, setIdade] = useState("");
  const [erro, setErro] = useState("");

  const chavePix = "58e6d787-d9ac-4e02-b7d3-2bb11aabb542";
  const whatsapp = "5511999999999";

  // 🚚 FRETE EM TEMPO REAL (AGORA FUNCIONA DE VERDADE)
  useEffect(() => {
    const ref = doc(db, "config", "loja");

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setFrete(Number(snap.data().frete || 0));
      }
    });

    return () => unsub();
  }, []);

  // 🔎 detecta kit festa
  const isKitFesta = cart.some((item) =>
    item.nome.toLowerCase().includes("kit festa")
  );

  // 💰 subtotal
  const subtotal = cart.reduce((sum, item) => {
    const preco = Number(item.preco.replace(",", "."));
    return sum + preco * item.qty;
  }, 0);

  const total = subtotal + frete;

  // ✅ validação
  function validar() {
    if (!nomeCliente.trim()) {
      setErro("⚠️ Preencha o NOME DO CLIENTE");
      return false;
    }

    if (isKitFesta) {
      if (!nomePersonalizado.trim()) {
        setErro("⚠️ Preencha o NOME para personalização");
        return false;
      }

      if (!idade.trim()) {
        setErro("⚠️ Preencha a IDADE");
        return false;
      }
    }

    setErro("");
    return true;
  }

  // 📲 mensagem WhatsApp
  function gerarMensagem() {
    let msg = `🛒 *NOVO PEDIDO*%0A%0A`;

    msg += `👤 Cliente: ${nomeCliente}%0A`;

    if (isKitFesta) {
      msg += `🎁 Personalização: ${nomePersonalizado}%0A`;
      msg += `🎉 Idade: ${idade}%0A`;
    }

    msg += `%0A📦 *Itens:*%0A`;

    cart.forEach((item) => {
      msg += `- ${item.nome} x${item.qty} = R$ ${item.preco}%0A`;
    });

    msg += `%0A🚚 Frete: R$ ${frete.toFixed(2)}%0A`;
    msg += `💰 Total: R$ ${total.toFixed(2)}%0A`;

    msg += `%0A📎 Envie o comprovante de pagamento`;

    return msg;
  }

  function enviar() {
    if (!validar()) return;

    window.open(
      `https://wa.me/${whatsapp}?text=${gerarMensagem()}`,
      "_blank"
    );
  }

  return (
    <div style={styles.page}>

      <h1>🛒 Carrinho</h1>

      <button onClick={() => router.push("/")} style={styles.continueBtn}>
        ← Continuar comprando
      </button>

      <div style={styles.container}>

        {/* ESQUERDA */}
        <div style={styles.left}>

          {cart.map((item, i) => (
            <div key={i} style={styles.item}>

              <h3>{item.nome}</h3>
              <p>R$ {item.preco}</p>

              <div style={styles.qtyBox}>
                <button onClick={() => decrease(item.id)} style={styles.qtyBtn}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => addToCart(item)} style={styles.qtyBtn}>+</button>

                <button
                  onClick={() => removeFromCart(item.id)}
                  style={styles.removeBtn}
                >
                  remover
                </button>
              </div>

            </div>
          ))}

          <h2>Subtotal: R$ {subtotal.toFixed(2)}</h2>

          <div style={styles.freteBox}>
            🚚 Frete: R$ {frete.toFixed(2)}
          </div>

          <h2>Total: R$ {total.toFixed(2)}</h2>

          {erro && <div style={styles.errorBox}>{erro}</div>}

          <input
            placeholder="Nome do cliente *"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            style={styles.input}
          />

          {isKitFesta && (
            <>
              <div style={styles.alert}>
                ⚠️ Produtos personalizados exigem dados obrigatórios
              </div>

              <input
                placeholder="Nome para personalização *"
                value={nomePersonalizado}
                onChange={(e) => setNomePersonalizado(e.target.value)}
                style={styles.input}
              />

              <input
                placeholder="Idade *"
                value={idade}
                onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
                style={styles.input}
              />
            </>
          )}

        </div>

        {/* DIREITA PIX */}
        <div style={styles.right}>

          <h3>💳 Pix</h3>

          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${chavePix}`}
            style={styles.qr}
          />

          <div style={styles.pixKey}>{chavePix}</div>

          <button
            style={styles.copyBtn}
            onClick={() => navigator.clipboard.writeText(chavePix)}
          >
            Copiar chave Pix
          </button>

          <button onClick={enviar} style={styles.whatsBtn}>
            Confirmar no WhatsApp
          </button>

          {/* 📢 AVISO IMPORTANTE */}
          <div style={styles.notice}>
            ⚠️ Após o pagamento, envie o comprovante + nome no WhatsApp.  
            Sem o comprovante o pedido NÃO será processado.
          </div>

        </div>

      </div>
    </div>
  );
}

/* 🎨 ESTILOS */
const styles = {
  page: {
    padding: 20,
    background: "#f5f7fb",
    minHeight: "100vh"
  },

  container: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap"
  },

  left: {
    flex: 2,
    minWidth: 300
  },

  right: {
    flex: 1,
    minWidth: 220,
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    textAlign: "center",
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)"
  },

  item: {
    background: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },

  qtyBox: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 8
  },

  qtyBtn: {
    width: 28,
    height: 28,
    background: "#2ecc71",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer"
  },

  removeBtn: {
    marginLeft: 10,
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    padding: "4px 8px",
    borderRadius: 6,
    cursor: "pointer"
  },

  freteBox: {
    marginTop: 10,
    padding: 10,
    background: "#ecf0f1",
    borderRadius: 8,
    fontWeight: "bold"
  },

  input: {
    width: "100%",
    padding: 10,
    marginTop: 8,
    borderRadius: 8,
    border: "1px solid #ddd"
  },

  alert: {
    marginTop: 10,
    background: "#f31212",
    color: "#fff",
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: "bold"
  },

  errorBox: {
    marginTop: 10,
    background: "#e74c3c",
    color: "#fff",
    padding: 10,
    borderRadius: 10,
    fontWeight: "bold"
  },

  qr: {
    width: 140,
    height: 140,
    margin: "10px auto"
  },

  pixKey: {
    fontSize: 12,
    background: "#f1f1f1",
    padding: 8,
    borderRadius: 8,
    wordBreak: "break-word"
  },

  copyBtn: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    background: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },

  whatsBtn: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer"
  },

  continueBtn: {
    marginBottom: 15,
    background: "#3498db",
    color: "#fff",
    border: "none",
    padding: 10,
    borderRadius: 8,
    cursor: "pointer"
  },

  notice: {
    marginTop: 12,
    background: "#ffeaa7",
    color: "#2d3436",
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: "bold"
  }
};