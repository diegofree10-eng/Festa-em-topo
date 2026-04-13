"use client";

import { useState } from "react";

export default function Admin() {

  const [products, setProducts] = useState([]);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [img, setImg] = useState("");

  function addProduct(){

    const newProduct = {
      id: Date.now(),
      nome,
      preco:Number(preco),
      img
    };

    const updated = [...products, newProduct];
    setProducts(updated);

    localStorage.setItem("products", JSON.stringify(updated));
  }

  function remove(id){
    const updated = products.filter(p=>p.id!==id);
    setProducts(updated);
    localStorage.setItem("products", JSON.stringify(updated));
  }

  function setFrete(v){
    localStorage.setItem("frete", v);
  }

  return (
    <div style={{ padding:20 }}>

      <h1>🧑‍💼 Admin</h1>

      <h3>Adicionar produto</h3>

      <input placeholder="Nome" onChange={e=>setNome(e.target.value)} />
      <input placeholder="Preço" onChange={e=>setPreco(e.target.value)} />
      <input placeholder="Imagem URL" onChange={e=>setImg(e.target.value)} />

      <button onClick={addProduct}>Adicionar</button>

      <hr />

      <h3>Frete fixo</h3>
      <input type="number" onChange={e=>setFrete(e.target.value)} />

      <hr />

      <h3>Produtos</h3>

      {products.map(p=>(
        <div key={p.id}>
          <p>{p.nome}</p>
          <button onClick={()=>remove(p.id)}>remover</button>
        </div>
      ))}

    </div>
  );
}