"use client";

import { useState } from "react";

export default function SimuladorPage() {
  // 1. O estado é declarado AQUI
  const [itens, setItens] = useState<any[]>([]);
  const [logistica, setLogistica] = useState('receber_em_casa');
  const [resultado, setResultado] = useState<any>(null);

  const adicionarItem = (nome: string, tipo: 'fisico' | 'digital') => {
    setItens([...itens, { id: Date.now(), nome, tipo, preco: 50 }]);
  };

  const removerItem = (id: number) => {
    setItens(itens.filter(item => item.id !== id));
  };

  const executarSimulacao = () => {
    const contemFisico = itens.some(i => i.tipo === 'fisico');
    const valorTotal = itens.reduce((acc, i) => acc + i.preco, 0);
    const ehFreteGratis = valorTotal >= 100;

    let dadosParaFirebase = {};

    if (!contemFisico) {
      dadosParaFirebase = { itens, formaEnvio: 'digital', transportadoraId: 'Digital', metodo: 'Digital' };
    } else if (logistica === 'retirar_loja') {
      dadosParaFirebase = { itens, formaEnvio: 'retirar_loja', transportadoraId: 'retirar_loja', metodo: 'Retirar na Loja' };
    } else {
      const transp = { id: 'transp_01', nome: 'Correios SEDEX' };
      dadosParaFirebase = {
        itens,
        formaEnvio: 'transportadora',
        transportadoraId: transp.id,
        metodo: ehFreteGratis ? `Frete Grátis Promocional + ${transp.nome}` : transp.nome
      };
    }
    setResultado(dadosParaFirebase);
  };

  // 2. O uso acontece AQUI dentro do retorno (mesmo escopo)
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Simulador de Checkout</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => adicionarItem('Produto Físico', 'fisico')} style={btnStyle}>Add Físico</button>
        <button onClick={() => adicionarItem('Produto Digital', 'digital')} style={btnStyle}>Add Digital</button>
      </div>

      <div>
        <h3>Itens no Carrinho:</h3>
        {itens.length === 0 ? <p>Carrinho vazio</p> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {itens.map((item) => (
              <li key={item.id} style={{ padding: '8px', border: '1px solid #ccc', marginBottom: '5px', borderRadius: '4px', background: item.tipo === 'digital' ? '#e0f2fe' : '#f0fdf4', display: 'flex', justifyContent: 'space-between' }}>
                {item.nome} - <strong>{item.tipo.toUpperCase()}</strong>
                <button onClick={() => removerItem(item.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}>X</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 20, padding: '15px', border: '1px solid #ddd' }}>
        <label style={{ display: 'block', cursor: 'pointer', padding: '10px' }}>
            <input type="radio" checked={logistica === 'retirar_loja'} onChange={() => setLogistica('retirar_loja')} /> 
            🏪 Retirar na Loja
        </label>
        <label style={{ display: 'block', cursor: 'pointer', padding: '10px' }}>
            <input type="radio" checked={logistica === 'receber_em_casa'} onChange={() => setLogistica('receber_em_casa')} /> 
            🏠 Receber em Casa
        </label>
      </div>

      <button onClick={executarSimulacao} style={{ marginTop: 20, padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Finalizar e Gerar JSON
      </button>

      {resultado && (
        <pre style={{ background: '#333', color: '#fff', padding: 15, marginTop: 20, borderRadius: '8px' }}>
          {JSON.stringify(resultado, null, 2)}
        </pre>
      )}
    </div>
  );
}

const btnStyle = {
    padding: '10px 20px', 
    backgroundColor: '#fff', 
    border: '2px solid #2563eb', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
};