"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminConfig() {
  const router = useRouter();
  const [config, setConfig] = useState({
    chavePix: "",
    freteFixo: "0,00",
    avisoDestaque: "",
    lojaAberta: true
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const formatMoneyInput = (value) => {
    let v = value.replace(/\D/g, "");
    v = (Number(v) / 100).toFixed(2);
    return v.replace(".", ",");
  };

  useEffect(() => {
    async function carregarConfig() {
      try {
        // Lendo do local correto: config/loja
        const docRef = doc(db, "config", "loja");
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const dados = snap.data();
          setConfig({
            chavePix: dados.chavePix || "",
            freteFixo: ((dados.frete || 0) / 100).toFixed(2).replace(".", ","),
            avisoDestaque: dados.avisoDestaque || "",
            lojaAberta: dados.lojaAberta ?? true
          });
        }
      } catch (error) {
        console.error("Erro ao carregar:", error);
      }
      setLoading(false);
    }
    carregarConfig();
  }, []);

  async function handleSalvar() {
    setSalvando(true);
    
    // 1. Limpeza rigorosa da chave Pix (remove espaços acidentais)
    const chaveLimpa = config.chavePix.trim().replace(/\s/g, "");

    // 2. Conversão do frete para centavos
    const valorNumerico = Number(config.freteFixo.replace(",", "."));
    const freteEmCentavos = Math.round(valorNumerico * 100);

    // 3. Montagem do objeto final para o banco
    const dadosParaSalvar = {
      chavePix: chaveLimpa, // Salva a chave sem espaços
      frete: isNaN(freteEmCentavos) ? 0 : freteEmCentavos,
      avisoDestaque: config.avisoDestaque,
      lojaAberta: config.lojaAberta,
      updatedAt: Date.now()
    };

    try {
      // Salva no local que o Carrinho consome: config/loja
      await setDoc(doc(db, "config", "loja"), dadosParaSalvar, { merge: true });
      
      // Opcional: Limpar também o rastro no caminho antigo para evitar confusão futura
      // await deleteDoc(doc(db, "configuraçoes", "geral")); 

      alert("Configurações atualizadas! O checkout já está usando a nova chave. ✅");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações.");
    }
    setSalvando(false);
  }

  if (loading) return <div style={styles.center}>Carregando configurações...</div>;

  return (
    <div style={styles.page}>
      <button onClick={() => router.back()} style={styles.btnBack}>⬅ Voltar ao Painel</button>
      
      <div style={styles.card}>
        <h2>⚙️ Configurações da Loja</h2>
        <p style={styles.sub}>Gerencie os dados de pagamento e funcionamento</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Chave PIX (Aleatória, CPF, Celular ou E-mail)</label>
          <input 
            type="text" 
            value={config.chavePix} 
            onChange={(e) => setConfig({...config, chavePix: e.target.value})}
            style={styles.input}
            placeholder="Cole sua chave aqui..."
          />
          <small style={{color: '#64748b', fontSize: '11px'}}>
            ⚠️ Certifique-se de que a chave está correta para receber os pagamentos.
          </small>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Valor do Frete Fixo (R$)</label>
          <input 
            type="text" 
            value={config.freteFixo} 
            onChange={(e) => setConfig({...config, freteFixo: formatMoneyInput(e.target.value)})}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Aviso no Topo</label>
          <input 
            type="text" 
            value={config.avisoDestaque} 
            onChange={(e) => setConfig({...config, avisoDestaque: e.target.value})}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Loja Online?</label>
          <select 
            value={config.lojaAberta} 
            onChange={(e) => setConfig({...config, lojaAberta: e.target.value === "true"})}
            style={styles.input}
          >
            <option value="true">🟢 Receber Pedidos</option>
            <option value="false">🔴 Pausar Pedidos</option>
          </select>
        </div>

        <button 
          onClick={handleSalvar} 
          disabled={salvando} 
          style={salvando ? styles.btnDisabled : styles.btnSalvar}
        >
          {salvando ? "Processando..." : "💾 Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "40px", background: "#f1f5f9", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "sans-serif" },
  btnBack: { alignSelf: "flex-start", marginBottom: "20px", background: "#475569", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  card: { background: "#fff", padding: "30px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "500px" },
  sub: { color: "#64748b", fontSize: "14px", marginBottom: "25px" },
  inputGroup: { marginBottom: "20px" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#334155", marginBottom: "5px", display: "block" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "5px", fontSize: "16px", outline: "none", boxSizing: "border-box" },
  btnSalvar: { width: "100%", padding: "15px", background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", marginTop: "10px" },
  btnDisabled: { width: "100%", padding: "15px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "not-allowed", fontSize: "16px", marginTop: "10px" },
  center: { textAlign: "center", marginTop: "100px", fontSize: "18px", color: "#64748b" }
};