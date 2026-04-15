"use client";

import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

export default function CartBar() {

  const { cart } = useCart();
  const router = useRouter();

  const total = cart.reduce((t, i) => t + i.qty, 0);

  return (
    <div style={bar} onClick={() => router.push("/carrinho")}>
      🛒 Carrinho: {total} itens
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
  padding: 12,
  fontWeight: "bold",
  zIndex: 999,
  cursor: "pointer"
};