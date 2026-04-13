"use client";

import { useState } from "react";

export default function Home() {

  const [cart, setCart] = useState([]);
  const [openCart, setOpenCart] = useState(false);

  const produtos = [
    {
      id: 1,
      nome: "Kit Festa Premium",
      preco: 50,
      img: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=500"
    },
    {
      id: 2,
      nome: "Adesivo",
      preco: 10,
      img: "https://images.unsplash.com/photo-1581091870627-3f7c6f06f5f6?w=500"
    },
    {
      id: 3,
      nome: "Combo Festa",
      preco: 120,
      img: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500"
    }
  ];

  function add(p) {
    const exists = cart.find(i => i.id === p.id);

    if (exists) {
      setCart(cart.map(i =>
        i.id === p.id ? { ...i, qty: i.qty + 1 } : i
      ));
    } else {
      setCart([...cart, { ...p, qty: 1 }]);
    }
  }

  function dec(id) {
    setCart(cart.map(i =>
      i.id === id && i.qty > 1 ? { ...i, qty: i.qty - 1 } : i
    ));
  }

  function remove(id) {
    setCart(cart.filter(i => i.id !== id));
  }

  const total = cart.reduce((a, b) => a + b.preco * b.qty, 0);

  return (
    <div style={page}>

      {/* HEADER */}
      <div style={header}>
        <h4>Loja</h4>

        <button onClick={() => setOpenCart(true)} style={cartBtn}>
          🛒 {cart.length}
        </button>
      </div>

      {/* GRID SHOPEE REAL (DENSO) */}
      <div style={grid}>
        {produtos.map(p => (
          <div key={p.id} style={card}>

            <div style={imgBox}>
              <img src={p.img} style={img} />
            </div>

            <p style={name}>{p.nome}</p>
            <p style={price}>R$ {p.preco}</p>

            <button style={btn} onClick={() => add(p)}>
              +
            </button>

          </div>
        ))}
      </div>

      {/* CARRINHO */}
      {openCart && (
        <div style={overlay}>
          <div style={side}>

            <div style={sideHeader}>
              <p>Carrinho</p>
              <button onClick={() => setOpenCart(false)}>X</button>
            </div>

            <div style={scroll}>
              {cart.map(i => (
                <div key={i.id} style={cartItem}>
                  <p style={{ fontSize: 11 }}>{i.nome}</p>

                  <div>
                    <button onClick={() => dec(i.id)}>-</button>
                    <span>{i.qty}</span>
                    <button onClick={() => add(i)}>+</button>
                  </div>

                  <button onClick={() => remove(i.id)}>remover</button>
                </div>
              ))}
            </div>

            <div style={sideFooter}>
              <b>Total: R$ {total.toFixed(2)}</b>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/* ===== SHOPEE REAL (ULTRA COMPACTO) ===== */

const page = { fontFamily: "Arial", background: "#f5f5f5" };

const header = {
  display: "flex",
  justifyContent: "space-between",
  padding: 8,
  background: "#ff5722",
  color: "#fff"
};

/* 🔥 ISSO AQUI É O QUE CORRIGE TUDO */
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 2,
  padding: 3
};

const card = {
  background: "#fff",
  borderRadius: 4,
  padding: 3
};

/* 🔥 MUITO PEQUENO MESMO */
const imgBox = {
  width: "100%",
  height: 55,
  overflow: "hidden",
  borderRadius: 4
};

const img = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const name = { fontSize: 10, margin: "2px 0" };
const price = { fontSize: 11, fontWeight: "bold" };

const btn = {
  width: "100%",
  padding: 3,
  fontSize: 10,
  background: "#ff5722",
  color: "#fff",
  border: "none",
  borderRadius: 3
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "flex-end"
};

const side = {
  width: 260,
  height: "100vh",
  background: "#fff",
  display: "flex",
  flexDirection: "column"
};

const sideHeader = {
  padding: 8,
  borderBottom: "1px solid #ddd"
};

const scroll = {
  flex: 1,
  overflowY: "auto",
  padding: 8
};

const sideFooter = {
  padding: 8,
  borderTop: "1px solid #ddd"
};

const cartItem = {
  borderBottom: "1px solid #eee",
  padding: 5
};

const cartBtn = {
  background: "#fff",
  color: "#ff5722",
  border: "none",
  padding: 5,
  borderRadius: 4
};