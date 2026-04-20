"use client";

import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  // Inicializa o estado tentando buscar do localStorage para não perder dados no refresh
  const [cart, setCart] = useState([]);

  // Efeito para carregar o carrinho ao abrir a página
  useEffect(() => {
    const salvo = localStorage.getItem("festaemtopo_carrinho");
    if (salvo) {
      try {
        setCart(JSON.parse(salvo));
      } catch (e) {
        console.error("Erro ao carregar carrinho");
      }
    }
  }, []);

  // Efeito para salvar no localStorage toda vez que o carrinho mudar
  useEffect(() => {
    localStorage.setItem("festaemtopo_carrinho", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product) {
    setCart((prev) => {
      const exists = prev.find(
        (p) => p.id === product.id && p.variacao === product.variacao
      );

      if (exists) {
        return prev.map((p) =>
          p.id === product.id && p.variacao === product.variacao
            ? { ...p, qty: p.qty + 1 }
            : p
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function removeFromCart(id, variacao = null) {
    setCart((prev) => 
      prev.filter((p) => !(p.id === id && p.variacao === variacao))
    );
  }

  function decrease(id, variacao = null) {
    setCart((prev) =>
      prev.map((p) =>
        p.id === id && p.variacao === variacao
          ? { ...p, qty: Math.max(1, p.qty - 1) }
          : p
      )
    );
  }

  function clearCart() {
    setCart([]);
    localStorage.removeItem("festaemtopo_carrinho");
  }

  const totalCarrinho = cart.reduce((acc, item) => {
    let precoString = "0.00";
    if (typeof item.preco === "string") {
      precoString = item.preco.replace(",", ".");
    } else if (typeof item.preco === "number") {
      precoString = item.preco.toString();
    }
    const precoNum = parseFloat(precoString);
    return acc + (isNaN(precoNum) ? 0 : precoNum) * item.qty;
  }, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, decrease, clearCart, totalCarrinho }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);