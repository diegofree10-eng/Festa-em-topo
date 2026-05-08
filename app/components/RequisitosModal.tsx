import React, { useState } from 'react';

interface RequisitosProps {
  config: {
    pedeNome: boolean;
    pedeIdade: boolean;
    pedeData: boolean;
    pedeObs: boolean;
  };
  onSave: (novosRequisitos: any) => void;
  onClose: () => void;
}

const RequisitosModal = ({ config, onSave, onClose }: RequisitosProps) => {
  const [localConfig, setLocalConfig] = useState(config);

  const toggle = (campo: string) => {
    setLocalConfig({ ...localConfig, [campo]: !((localConfig as any)[campo]) });
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000
  };

  const contentStyle: React.CSSProperties = {
    background: '#fff',
    padding: '25px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer'
  };

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>
          Personalização do Produto
        </h3>
        
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>
          Marque quais informações o cliente <b>precisa</b> preencher ao comprar:
        </p>

        <div onClick={() => toggle('pedeNome')} style={itemStyle}>
          <input type="checkbox" checked={localConfig.pedeNome} readOnly />
          <span>Nome da criança/pessoa</span>
        </div>

        <div onClick={() => toggle('pedeIdade')} style={itemStyle}>
          <input type="checkbox" checked={localConfig.pedeIdade} readOnly />
          <span>Idade (Ex: 1º Aninho)</span>
        </div>

        <div onClick={() => toggle('pedeData')} style={itemStyle}>
          <input type="checkbox" checked={localConfig.pedeData} readOnly />
          <span>Data/Hora/Local (Convites)</span>
        </div>

        <div onClick={() => toggle('pedeObs')} style={itemStyle}>
          <input type="checkbox" checked={localConfig.pedeObs} readOnly />
          <span>Observações Gerais</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
          <button 
            onClick={() => onSave(localConfig)}
            style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Confirmar
          </button>
          <button 
            onClick={onClose}
            style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequisitosModal;