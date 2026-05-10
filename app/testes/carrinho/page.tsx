"use client";
import React from 'react';

export default function TesteCarrinhoEditorial() {
  const corPrimaria = '#f3b34c';

  return (
    <div style={{ backgroundColor: '#fdf5eb', minHeight: '100vh', padding: '80px 20px', fontFamily: 'serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>Sua Sacola</h2>
        
        {/* ITEM */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
          <div style={{ width: '80px', height: '100px', backgroundColor: '#eee' }}></div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>Topo de Bolo Elegance</h4>
            <p style={{ fontSize: '12px', color: '#999' }}>Valentina - 5 anos</p>
          </div>
          <div style={{ fontWeight: 'bold' }}>R$ 89,90</div>
        </div>

        {/* TOTAL */}
        <div style={{ textAlign: 'right', marginTop: '40px' }}>
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>Total: <strong>R$ 89,90</strong></div>
          <button style={{ padding: '15px 40px', backgroundColor: corPrimaria, color: '#fff', border: 'none', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>
            Finalizar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}