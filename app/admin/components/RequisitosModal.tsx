"use client";

import React, { useState, useEffect } from "react";

// Reaproveitamos os estilos do seu sistema para manter o design idêntico
const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    background: 'rgba(0,0,0,0.6)', display: 'flex', 
    justifyContent: 'center', alignItems: 'center', zIndex: 2000 
  },
  content: { 
    background: '#fff', padding: '25px', borderRadius: '12px', 
    width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
  },
  title: { fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b', textAlign: 'center' },
  optionRow: { 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
    padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' 
  },
  label: { fontSize: '14px', color: '#475569', fontWeight: '500' },
  switch: { width: '40px', height: '20px', borderRadius: '20px', position: 'relative', transition: '0.3s' },
  btnSave: { 
    width: '100%', padding: '12px', background: '#d946ef', color: '#fff', 
    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' 
  },
  btnClose: { 
    width: '100%', padding: '10px', background: 'transparent', color: '#94a3b8', 
    border: 'none', cursor: 'pointer', fontSize: '13px', marginTop: '5px' 
  }
};

interface Props {
  config: {
    pedeNome: boolean;
    pedeIdade: boolean;
    pedeData: boolean;
    pedeObs: boolean;
  };
  onSave: (novos: any) => void;
  onClose: () => void;
}

export default function RequisitosModal({ config, onSave, onClose }: Props) {
  // Estado interno para manipular antes de salvar
  const [localConfig, setLocalConfig] = useState(config);

  // Atualiza o estado local se a config do pai mudar
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const toggle = (campo: string) => {
    setLocalConfig(prev => ({ ...prev, [campo]: !prev[prev.hasOwnProperty(campo) ? campo : ''] }));
    // Lógica simples de inversão
    const novoValor = !(localConfig as any)[campo];
    setLocalConfig({ ...localConfig, [campo]: novoValor });
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
        <h3 style={modalStyles.title}>🎯 Dados para Personalização</h3>
        
        <p style={{fontSize: '12px', color: '#94a3b8', marginBottom: '15px', textAlign: 'center'}}>
          Selecione quais informações o cliente deve preencher ao comprar este produto.
        </p>

        <div style={modalStyles.optionRow} onClick={() => toggle('pedeNome')}>
          <span style={modalStyles.label}>Solicitar Nome</span>
          <div style={{...modalStyles.switch, background: localConfig.pedeNome ? '#d946ef' : '#cbd5e1'}}>
            <div style={{
              width: '16px', height: '16px', background: '#fff', borderRadius: '50%', 
              position: 'absolute', top: '2px', left: localConfig.pedeNome ? '22px' : '2px', transition: '0.2s'
            }} />
          </div>
        </div>

        <div style={modalStyles.optionRow} onClick={() => toggle('pedeIdade')}>
          <span style={modalStyles.label}>Solicitar Idade</span>
          <div style={{...modalStyles.switch, background: localConfig.pedeIdade ? '#d946ef' : '#cbd5e1'}}>
            <div style={{
              width: '16px', height: '16px', background: '#fff', borderRadius: '50%', 
              position: 'absolute', top: '2px', left: localConfig.pedeIdade ? '22px' : '2px', transition: '0.2s'
            }} />
          </div>
        </div>

        <div style={modalStyles.optionRow} onClick={() => toggle('pedeData')}>
          <span style={modalStyles.label}>Solicitar Data do Evento</span>
          <div style={{...modalStyles.switch, background: localConfig.pedeData ? '#d946ef' : '#cbd5e1'}}>
            <div style={{
              width: '16px', height: '16px', background: '#fff', borderRadius: '50%', 
              position: 'absolute', top: '2px', left: localConfig.pedeData ? '22px' : '2px', transition: '0.2s'
            }} />
          </div>
        </div>

        <div style={modalStyles.optionRow} onClick={() => toggle('pedeObs')}>
          <span style={modalStyles.label}>Campo de Observações</span>
          <div style={{...modalStyles.switch, background: localConfig.pedeObs ? '#d946ef' : '#cbd5e1'}}>
            <div style={{
              width: '16px', height: '16px', background: '#fff', borderRadius: '50%', 
              position: 'absolute', top: '2px', left: localConfig.pedeObs ? '22px' : '2px', transition: '0.2s'
            }} />
          </div>
        </div>

        <button style={modalStyles.btnSave} onClick={() => onSave(localConfig)}>
          Salvar Configuração
        </button>
        
        <button style={modalStyles.btnClose} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}