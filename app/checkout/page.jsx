"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function Checkout() {

  const [cart, setCart] = useState([]);
  const [qr, setQr] = useState("");
  const [pixCode, setPixCode] = useState("");

  const frete = 10; // 🔥 depois você pode mudar no admin
  const chavePix = "58e6d787-d9ac-4e02-b7d3-2bb11aabb542";
  const whatsapp = "5512981654900";

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(data);
  }, []);

  const subtotal = cart.reduce((a, b) => a + b.preco * b.qty, 0);
  const total = subtotal + frete;

  async function gerarPix() {

    const itens = cart.map(i =>
      `${i.nome} x${i.qty} - R$ ${i.preco * i.qty}`
    ).join("\n");

    const payload = `
PEDIDO LOJA
------------
${itens}
------------
FRETE: R$ ${frete}
TOTAL: R$ ${total}
PIX: ${chavePix}
`;

    const qrImg = await QRCode.toDataURL(payload);

    setQr(qrImg);
    setPixCode(payload);
  }

  function enviarWhats() {

    const itens = cart.map(i =>
      `${i.nome} x${i.qty}`
    ).join("%0A");

    const msg = `NOVO PEDIDO:%0A${itens}%0A%0ATOTAL: R$ ${total}%0AEnviar comprovante PIX`;

    window.open(`https://wa.me/${whatsapp}?text=${msg}`, "_blank");
  }

  return (
    <div style={page}>

      <h2>Finalizar Pedido</h2>

      <div style={box}>
        {cart.map(i => (
          <p key={i.id}>
            {i.nome} x{i.qty} - R$ {i.preco * i.qty}
          </p>
        ))}
      </div>

      <h3>Frete: R$ {frete}</h3>
      <h2>Total: R$ {total}</h2>

      <button style={btn} onClick={gerarPix}>
        Gerar PIX
      </button>

      {qr && (
        <>
          <img src={qr} width={200} />

          <textarea
            value={pixCode}
            readOnly
            style={textarea}
          />

          <p>Envie o comprovante no WhatsApp</p>

          <button style={btnGreen} onClick={enviarWhats}>
            Enviar pedido
          </button>
        </>
      )}

    </div>
  );
}

/* ===== STYLE SIMPLES ===== */

const page = { padding: 20, fontFamily: "Arial" };

const box = {
  border: "1px solid #ddd",
  padding: 10,
  marginBottom: 10
};

const btn = {
  padding: 10,
  background: "#ff5722",
  color: "#fff",
  border: "none",
  marginTop: 10
};

const btnGreen = {
  padding: 10,
  background: "green",
  color: "#fff",
  border: "none",
  marginTop: 10
};

const textarea = {
  width: "100%",
  height: 80,
  marginTop: 10
};