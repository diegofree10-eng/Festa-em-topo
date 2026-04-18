"use client";

import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // Adicionar ao carrinho
  function addToCart(product) {
    setCart((prev) => {
      // Verifica se o produto com o MESMO ID e MESMA VARIAÇÃO já está no carrinho
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

      // Adiciona como novo item se não existir ou se a variação for diferente
      return [...prev, { ...product, qty: 1 }];
    });
  }

  // Remover item completamente (considerando a variação)
  function removeFromCart(id, variacao = null) {
    setCart((prev) => 
      prev.filter((p) => !(p.id === id && p.variacao === variacao))
    );
  }

  // Diminuir quantidade (considerando a variação)
  function decrease(id, variacao = null) {
    setCart((prev) =>
      prev.map((p) =>
        p.id === id && p.variacao === variacao
          ? { ...p, qty: Math.max(1, p.qty - 1) }
          : p
      )
    );
  }

  // Limpar carrinho (Útil para após o envio do pedido no Whats)
  function clearCart() {
    setCart([]);
  }

  // CÁLCULO DO TOTAL
  const totalCarrinho = cart.reduce((acc, item) => {
    // Tratamento de segurança para o preço
    let precoString = "0.00";
    
    if (typeof item.preco === "string") {
      precoString = item.preco.replace(",", ".");
    } else if (typeof item.preco === "number") {
      precoString = item.preco.toString();
    }

    const precoNum = parseFloat(precoString);
    const valorItem = isNaN(precoNum) ? 0 : precoNum;
    
    return acc + valorItem * item.qty;
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