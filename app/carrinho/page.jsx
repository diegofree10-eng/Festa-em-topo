"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function Home() {

  const chavePix = "58e6d787-d9ac-4e02-b7d3-2bb11aabb542";
  const numeroWhats = "5512981654900";

  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);

  const [pixImg, setPixImg] = useState("");
  const [pixCode, setPixCode] = useState("");

  const produtos = [
    { id: 1, nome: "Kit Festa", preco: 50 },
    { id: 2, nome: "Adesivo Personalizado", preco: 10 },
    { id: 3, nome: "Combo Festa Completo", preco: 120 }
  ];

  function add(produto) {
    const existe = cart.find(i => i.id === produto.id);

    if (existe) {
      setCart(cart.map(i =>
        i.id === produto.id ? { ...i, qty: i.qty + 1 } : i
      ));
    } else {
      setCart([...cart, { ...produto, qty: 1 }]);
    }

    setOpen(true);
  }

  function inc(id) {
    setCart(cart.map(i =>
      i.id === id ? { ...i, qty: i.qty + 1 } : i
    ));
  }

  function dec(id) {
    setCart(cart.map(i =>
      i.id === id && i.qty > 1
        ? { ...i, qty: i.qty - 1 }
        : i
    ));
  }

  function remove(id) {
    setCart(cart.filter(i => i.id !== id));
  }

  const total = cart.reduce(
    (a, b) => a + b.preco * b.qty,
    0
  );

  async function finalizarCompra() {

    const itens = cart.map(i =>
      `${i.nome} x${i.qty} - R$ ${i.preco * i.qty}`
    ).join("\n");

    const payload = `
PEDIDO LOJA
----------------
${itens}
----------------
TOTAL: R$ ${total.toFixed(2)}
PIX: ${chavePix}
`;

    const qr = await QRCode.toDataURL(payload);

    setPixImg(qr);
    setPixCode(payload);

    const msg = `Pedido Loja%0A----------------%0A${itens}%0A----------------%0ATotal: R$ ${total.toFixed(2)}%0APIX: ${chavePix}`;

    window.open(`https://wa.me/${numeroWhats}?text=${msg}`, "_blank");
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>

      <h1>🛒 Minha Loja</h1>

      {produtos.map(p => (
        <div key={p.id} style={box}>
          <h3>{p.nome}</h3>
          <p>R$ {p.preco}</p>
          <button onClick={() => add(p)} style={btn}>
            Adicionar
          </button>
        </div>
      ))}

      <button onClick={() => setOpen(true)} style={btn}>
        Carrinho ({cart.length})
      </button>

      {/* 🛒 CARRINHO */}
      {open && (
        <div style={overlay}>

          <div style={panel}>

            {/* HEADER FIXO */}
            <div style={header}>
              <h2>🛒 Carrinho</h2>
              <button onClick={() => setOpen(false)}>✖</button>
            </div>

            {/* LISTA COM SCROLL */}
            <div style={list}>
              {cart.map(i => (
                <div key={i.id} style={item}>

                  <p><b>{i.nome}</b></p>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => dec(i.id)}>-</button>
                    <span>{i.qty}</span>
                    <button onClick={() => inc(i.id)}>+</button>
                  </div>

                  <button onClick={() => remove(i.id)}>
                    remover
                  </button>

                </div>
              ))}
            </div>

            {/* 🔥 FOOTER FIXO (PIX + WHATS SEMPRE VISÍVEL) */}
            <div style={footer}>

              <h3>Total: R$ {total.toFixed(2)}</h3>

              <button onClick={finalizarCompra} style={pay}>
                💳 Finalizar Compra
              </button>

              {pixImg && (
                <div style={{ marginTop: 10 }}>

                  <img src={pixImg} width={180} />

                  <textarea
                    value={pixCode}
                    readOnly
                    style={{ width: "100%", height: 60 }}
                  />

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/* ===== ESTILOS CORRIGIDOS ===== */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "flex-end"
};

const panel = {
  width: 340,
  height: "100vh",
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden" // 🔥 ESSENCIAL
};

const header = {
  padding: 15,
  borderBottom: "1px solid #ddd",
  display: "flex",
  justifyContent: "space-between"
};

const list = {
  flex: 1,
  overflowY: "auto" // 🔥 SCROLL REAL SÓ AQUI
};

const footer = {
  padding: 15,
  borderTop: "1px solid #ddd",
  background: "#fff",
  flexShrink: 0 // 🔥 impede sumir
};

const item = {
  border: "1px solid #ddd",
  padding: 10,
  margin: 10
};

const btn = {
  padding: 10,
  margin: 5,
  background: "#0070f3",
  color: "#fff",
  border: "none",
  borderRadius: 6
};

const pay = {
  width: "100%",
  padding: 12,
  background: "green",
  color: "#fff",
  border: "none",
  borderRadius: 8
};