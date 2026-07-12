"use client";

import React, { useState, useEffect } from "react";
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
  onSave: (novaTabela: any) => void;
  gerarCombinacoes: () => any[];
  sugerirSkus: (tabela: any, setTabela: any) => void;
}

export default function VariacoesModal({
  showVarModal, setShowVarModal, nomeVar1, setNomeVar1, opcoesVar1, setOpcoesVar1,
  nomeVar2, setNomeVar2, opcoesVar2, setOpcoesVar2, tabelaPrecos, onSave, gerarCombinacoes, sugerirSkus,
}: VariacoesModalProps) {
  
  const [draftTabela, setDraftTabela] = useState(tabelaPrecos);
  const [showVar2, setShowVar2] = useState(nomeVar2 !== "" || opcoesVar2.length > 0);

  useEffect(() => {
    if (showVarModal) {
      setDraftTabela(tabelaPrecos);
    }
  }, [showVarModal]); 

  if (!showVarModal) return null;

  const combinacoesValidas = gerarCombinacoes();
  const temVariaçõesVisiveis = opcoesVar1.some(op => op.trim() !== "");

  const handleDraftInput = (key: string, campo: string, valor: string) => {
    const cleanValue = campo === "foto" ? valor : valor.replace(/\D/g, "");
    const formatted = campo === "foto" ? valor : (cleanValue ? (parseInt(cleanValue) / 100).toFixed(2) : "");
    
    setDraftTabela((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], [campo]: formatted }
    }));
  };

  return (
    <div style={shopeeStyles.overlay}>
      <div style={shopeeStyles.modal}>
        {/* Cabeçalho */}
        <div style={{ ...shopeeStyles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={shopeeStyles.title}>Grade de Variações</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {temVariaçõesVisiveis && (
              <button 
                type="button" 
                onClick={() => sugerirSkus(draftTabela, setDraftTabela)}
                style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                ⚡ Gerar SKUs
              </button>
            )}
            <button onClick={() => setShowVarModal(false)} style={shopeeStyles.closeBtn}>✕</button>
          </div>
        </div>

        <div style={shopeeStyles.content}>
          {/* VARIAÇÃO 1 */}
          <div style={shopeeStyles.section}>
            <label style={shopeeStyles.label}>Variação 1 (ex: Cor)</label>
            <div style={shopeeStyles.varBox}>
               <input style={styles.input} value={nomeVar1} onChange={e => setNomeVar1(e.target.value)} placeholder="Ex: Cor" />
               <div style={shopeeStyles.tagsContainer}>
                {opcoesVar1.map((op, idx) => (
                  <div key={idx} style={shopeeStyles.tagInputWrapper}>
                    <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar1]; n[idx] = e.target.value; setOpcoesVar1(n); }} />
                    <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar1(opcoesVar1.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar1([...opcoesVar1, ""])}>+ Opção</button>
               </div>
            </div>
          </div>

          {/* VARIAÇÃO 2 */}
          <div style={shopeeStyles.section}>
            {!showVar2 ? (
              <button onClick={() => setShowVar2(true)} style={{ ...shopeeStyles.addBtn, padding: '10px 20px', border: '1px dashed #ee4d2d', color: '#ee4d2d' }}>
                + Adicionar Variação 2
              </button>
            ) : (
              <div style={{ ...shopeeStyles.varBox, border: '1px solid #e2e8f0', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={shopeeStyles.label}>Variação 2</label>
                  <button onClick={() => { setShowVar2(false); setNomeVar2(""); setOpcoesVar2([]); }} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>Remover</button>
                </div>
                <input style={styles.input} value={nomeVar2} onChange={e => setNomeVar2(e.target.value)} placeholder="Ex: Tamanho" />
                <div style={shopeeStyles.tagsContainer}>
                  {opcoesVar2.map((op, idx) => (
                    <div key={idx} style={shopeeStyles.tagInputWrapper}>
                      <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar2]; n[idx] = e.target.value; setOpcoesVar2(n); }} />
                      <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar2(opcoesVar2.filter((_, i) => i !== idx))}>✕</button>
                    </div>
                  ))}
                  <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar2([...opcoesVar2, ""])}>+ Opção</button>
                </div>
              </div>
            )}
          </div>

          {/* TABELA DINÂMICA */}
          {temVariaçõesVisiveis && combinacoesValidas.length > 0 && (
            <table style={{ ...shopeeStyles.table, width: '100%', marginTop: '20px' }}>
              <thead>
                <tr style={shopeeStyles.trHead}>
                  <th style={{...shopeeStyles.th, width: '100px'}}>Var 1</th>
                  {showVar2 && <th style={shopeeStyles.th}>Var 2</th>}
                  <th style={shopeeStyles.th}>SKU</th>
                  <th style={shopeeStyles.th}>Preço</th>
                  <th style={shopeeStyles.th}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {opcoesVar1.filter(v1 => v1.trim() !== "").map((v1) => {
                  const combsDesteGrupo = combinacoesValidas.filter(c => c.v1 === v1);
                  return combsDesteGrupo.map((c, idx) => {
                    const temFoto = !!draftTabela[c.key]?.foto;
                    return (
                      <tr key={c.key}>
                        {idx === 0 && (
                          <td rowSpan={combsDesteGrupo.length} style={{...shopeeStyles.td, textAlign: 'center', backgroundColor: '#f8fafc'}}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{v1}</div>
                            <div style={{ width: '50px', height: '50px', margin: '0 auto', border: temFoto ? '1px solid #3b82f6' : '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                              {temFoto ? (
                                <>
                                  <img src={draftTabela[c.key].foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <button onClick={(e) => { e.preventDefault(); combsDesteGrupo.forEach(comb => handleDraftInput(comb.key, "foto", "")); }} style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '18px', color: '#cbd5e1' }}>+</span>
                                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if(!file) return;
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const img = new Image();
                                        img.src = ev.target?.result as string;
                                        img.onload = () => {
                                           const canvas = document.createElement('canvas');
                                           canvas.width = 300; canvas.height = 300;
                                           canvas.getContext('2d')?.drawImage(img, 0, 0, 300, 300);
                                           const compressed = canvas.toDataURL('image/jpeg', 0.7);
                                           combsDesteGrupo.forEach(comb => handleDraftInput(comb.key, "foto", compressed));
                                        };
                                      };
                                      reader.readAsDataURL(file);
                                  }} />
                                </>
                              )}
                            </div>
                          </td>
                        )}
                        {showVar2 && <td style={shopeeStyles.td}>{c.v2 || "-"}</td>}
                        <td style={shopeeStyles.td}><input style={shopeeStyles.tableInput} value={draftTabela[c.key]?.sku || ""} onChange={e => handleDraftInput(c.key, "sku", e.target.value)} placeholder="SKU" /></td>
                        <td style={shopeeStyles.td}><input style={shopeeStyles.tableInput} value={draftTabela[c.key]?.preco || ""} onChange={e => handleDraftInput(c.key, "preco", e.target.value)} placeholder="0.00" /></td>
                        <td style={shopeeStyles.td}><input style={shopeeStyles.tableInput} value={draftTabela[c.key]?.custo || ""} onChange={e => handleDraftInput(c.key, "custo", e.target.value)} placeholder="0.00" /></td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
          <button 
            onClick={() => {
                setDraftTabela(tabelaPrecos); // Força o backup a voltar ao original antes de fechar
                setShowVarModal(false);
            }} 
            style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onSave(draftTabela); setShowVarModal(false); }} 
            style={{ padding: '10px 40px', borderRadius: '4px', backgroundColor: '#ee4d2d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Salvar Grade
          </button>
        </div>
      </div>
    </div>
  );
}