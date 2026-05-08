"use client";

import React from "react";
// Importamos os estilos que estão no seu arquivo styles.ts
import { shopeeStyles, styles } from "../produtos/styles";

interface VariacoesModalProps {
  showVarModal: boolean;
  setShowVarModal: (show: boolean) => void;
  nomeVar1: string;
  setNomeVar1: (val: string) => void;
  opcoesVar1: string[];
  setOpcoesVar1: (val: string[]) => void;
  nomeVar2: string;
  setNomeVar2: (val: string) => void;
  opcoesVar2: string[];
  setOpcoesVar2: (val: string[]) => void;
  tabelaPrecos: any;
  handleInputTabela: (key: string, campo: string, valor: string) => void;
  gerarCombinacoes: () => any[];
}

export default function VariacoesModal({
  showVarModal,
  setShowVarModal,
  nomeVar1,
  setNomeVar1,
  opcoesVar1,
  setOpcoesVar1,
  nomeVar2,
  setNomeVar2,
  opcoesVar2,
  setOpcoesVar2,
  tabelaPrecos,
  handleInputTabela,
  gerarCombinacoes,
}: VariacoesModalProps) {
  if (!showVarModal) return null;

  return (
    <div style={shopeeStyles.overlay}>
      <div style={shopeeStyles.modal}>
        <div style={shopeeStyles.header}>
          <h3 style={shopeeStyles.title}>Grade de Variações</h3>
          <button onClick={() => setShowVarModal(false)} style={shopeeStyles.closeBtn}>✕</button>
        </div>

        <div style={shopeeStyles.content}>
          {/* SEÇÃO VARIAÇÃO 1 */}
          <div style={shopeeStyles.section}>
            <label style={shopeeStyles.label}>Variação 1 (ex: Modelo ou Cor)</label>
            <div style={shopeeStyles.varBox}>
              <input style={styles.input} value={nomeVar1} onChange={e => setNomeVar1(e.target.value)} placeholder="Ex: Modelo" />
              <div style={shopeeStyles.tagsContainer}>
                {opcoesVar1.map((op, idx) => (
                  <div key={idx} style={shopeeStyles.tagInputWrapper}>
                    <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar1]; n[idx] = e.target.value; setOpcoesVar1(n); }} />
                    <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar1(opcoesVar1.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar1([...opcoesVar1, ""])}>+ Adicionar</button>
              </div>
            </div>
          </div>

          {/* SEÇÃO VARIAÇÃO 2 */}
          <div style={shopeeStyles.section}>
            <label style={shopeeStyles.label}>Variação 2 (ex: Tamanho ou Qtd)</label>
            <div style={shopeeStyles.varBox}>
              <input style={styles.input} value={nomeVar2} onChange={e => setNomeVar2(e.target.value)} placeholder="Ex: Tamanho" />
              <div style={shopeeStyles.tagsContainer}>
                {opcoesVar2.map((op, idx) => (
                  <div key={idx} style={shopeeStyles.tagInputWrapper}>
                    <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar2]; n[idx] = e.target.value; setOpcoesVar2(n); }} />
                    <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar2(opcoesVar2.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar2([...opcoesVar2, ""])}>+ Adicionar</button>
              </div>
            </div>
          </div>

          <table style={{ ...shopeeStyles.table, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={shopeeStyles.trHead}>
                <th style={{ ...shopeeStyles.th, width: '130px' }}>{nomeVar1 || "Var 1"} (Foto Opcional)</th>
                <th style={shopeeStyles.th}>{nomeVar2 || "Var 2"}</th>
                <th style={shopeeStyles.th}>Preço (R$)</th>
                <th style={shopeeStyles.th}>Custo (R$)</th>
              </tr>
            </thead>
            <tbody>
              {opcoesVar1.map((v1) => {
                const combsDesteGrupo = gerarCombinacoes().filter(c => c.v1 === v1);
                return combsDesteGrupo.map((c, idx) => (
                  <tr key={c.key} style={{ ...shopeeStyles.tr, borderBottom: '1px solid #e2e8f0' }}>
                    {idx === 0 && (
                      <td rowSpan={combsDesteGrupo.length} style={{ ...shopeeStyles.td, textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>{v1}</div>
                        
                        {/* BOX DE FOTO OPCIONAL */}
                        <div style={{ 
                          width: '65px', height: '65px', margin: '0 auto', 
                          border: tabelaPrecos[c.key]?.foto ? '1px solid #3b82f6' : '1px dashed #cbd5e1', 
                          borderRadius: '6px', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', cursor: 'pointer', position: 'relative', 
                          background: '#fff', overflow: 'hidden' 
                        }}>
                          {tabelaPrecos[c.key]?.foto ? (
                            <>
                              <img src={tabelaPrecos[c.key].foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                              {/* Botão para remover a foto se quiser deixar em branco de novo */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  combsDesteGrupo.forEach(comb => handleInputTabela(comb.key, "foto", ""));
                                }}
                                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', fontSize: '10px', padding: '2px 5px', cursor: 'pointer' }}
                              >✕</button>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ color: '#94a3b8', fontSize: '20px' }}>+</span>
                              <div style={{ fontSize: '8px', color: '#94a3b8' }}>FOTO</div>
                            </div>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const img = new Image();
                                img.src = event.target?.result as string;
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX = 600;
                                  let w = img.width, h = img.height;
                                  if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                                  else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                                  canvas.width = w; canvas.height = h;
                                  const ctx = canvas.getContext('2d');
                                  ctx?.drawImage(img, 0, 0, w, h);
                                  const compressed = canvas.toDataURL('image/jpeg', 0.8);
                                  // Aplica a foto para todas as variações que compartilham esse v1 (estilo Shopee)
                                  combsDesteGrupo.forEach(comb => handleInputTabela(comb.key, "foto", compressed));
                                };
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>Opcional</div>
                      </td>
                    )}
                    <td style={{ ...shopeeStyles.td, textAlign: 'center', fontSize: '12px' }}>{c.v2 || "-"}</td>
                    <td style={shopeeStyles.td}>
                      <input style={shopeeStyles.tableInput} value={tabelaPrecos[c.key]?.preco || ""} onChange={e => handleInputTabela(c.key, "preco", e.target.value)} placeholder="0,00" />
                    </td>
                    <td style={shopeeStyles.td}>
                      <input style={shopeeStyles.tableInput} value={tabelaPrecos[c.key]?.custo || ""} onChange={e => handleInputTabela(c.key, "custo", e.target.value)} placeholder="0,00" />
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
        <div style={shopeeStyles.footer}>
          <button 
            style={{ backgroundColor: '#ee4d2d', color: '#fff', border: 'none', padding: '10px 40px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }} 
            onClick={() => setShowVarModal(false)}
          >
            Confirmar Grade
          </button>
        </div>
      </div>
    </div>
  );
}