"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function Checkout() {

  const [cart, setCart] = useState([]);
  const [pix, setPix] = useState("");

  const [frete, setFrete] = useState(10); // padrão

  const chavePix = "58e6d787-d9ac-4e02-b7d3-2bb11aabb542";

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(c);

    const f = Number(localStorage.getItem("frete")) || 10;
    setFrete(f);
  }, []);

  const total = cart.reduce((a,b)=>a+b.preco*b.qty,0) + frete;

  async function gerarPix(){

    const texto = `
Pedido
-------
${cart.map(i=>`${i.nome} x${i.qty}`).join("\n")}
-------
Total: R$ ${total}
PIX: ${chavePix}
`;

    const img = await QRCode.toDataURL(texto);
    setPix(img);
  }

  function enviarWhats(){
    window.open(
      "https://wa.me/5512981654900?text=Novo pedido realizado, enviar comprovante PIX",
      "_blank"
    );
  }

  return (
    <div style={{ display:"flex", gap:20, padding:20 }}>

      {/* ITENS */}
      <div style={{ flex:1 }}>
        <h2>Resumo</h2>

        {cart.map(i=>(
          <p key={i.id}>
            {i.nome} x{i.qty} - R$ {i.preco*i.qty}
          </p>
        ))}

      </div>

      {/* RESUMO FIXO */}
      <div style={{
        width:300,
        border:"1px solid #ddd",
        padding:10
      }}>

        <h3>Resumo final</h3>

        <p>Frete: R$ {frete}</p>
        <p><b>Total: R$ {total}</b></p>

        <button onClick={gerarPix} style={{ width:"100%", padding:10 }}>
          Gerar PIX
        </button>

        {pix && <img src={pix} width="100%" />}

        <button onClick={enviarWhats} style={{ marginTop:10, background:"green", color:"#fff", width:"100%" }}>
          Enviar WhatsApp
        </button>

      </div>

    </div>
  );
}