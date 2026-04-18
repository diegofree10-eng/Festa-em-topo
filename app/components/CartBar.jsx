"use client";

import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

export default function CartBar() {
  const { cart } = useCart();
  const router = useRouter();

  // Quantidade total de itens
  const totalItens = cart.reduce((t, i) => t + i.qty, 0);

  // Valor total em Dinheiro
  const totalDinheiro = cart.reduce((acc, item) => {
    const precoNum = parseFloat(item.preco.replace(",", "."));
    return acc + precoNum * item.qty;
  }, 0);

  if (totalItens === 0) return null; // Esconde a barra se o carrinho estiver vazio

  return (
    <div style={bar} onClick={() => router.push("/carrinho")}>
      <div>🛒 Ver Carrinho ({totalItens} {totalItens === 1 ? 'item' : 'itens'})</div>
      <div>Total: R$ {totalDinheiro.toFixed(2).replace(".", ",")} ➔</div>
    </div>
  );
}

const bar = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  background: "#ff6a00",
  color: "#fff",
  padding: "12px 20px",
  fontWeight: "bold",
  zIndex: 999,
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between", // Coloca itens e valor em pontas opostas
  alignItems: "center",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
};