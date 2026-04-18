"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminConfig() {
  const router = useRouter();
  const [config, setConfig] = useState({
    chavePix: "",
    freteFixo: "0,00", // Máscara para exibição
    avisoDestaque: "",
    lojaAberta: true
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Formatação de moeda para o input
  const formatMoneyInput = (value) => {
    let v = value.replace(/\D/g, "");
    v = (Number(v) / 100).toFixed(2);
    return v.replace(".", ",");
  };

  useEffect(() => {
    async function carregarConfig() {
      try {
        const docRef = doc(db, "config", "loja");
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const dados = snap.data();
          setConfig({
            chavePix: dados.chavePix || "",
            // Pegamos 'frete' do banco e convertemos para string formatada
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
    
    // Converte a string "15,00" para o número 15.00 e depois para 1500 (centavos)
    const valorNumerico = Number(config.freteFixo.replace(",", "."));
    const freteEmCentavos = Math.round(valorNumerico * 100);

    // Objeto EXATO que o Carrinho espera ler
    const dadosParaSalvar = {
      chavePix: config.chavePix,
      frete: isNaN(freteEmCentavos) ? 0 : freteEmCentavos, // CAMPO 'frete'
      avisoDestaque: config.avisoDestaque,
      lojaAberta: config.lojaAberta,
      updatedAt: Date.now() // Força uma atualização de timestamp
    };

    try {
      // Salva em config/loja
      await setDoc(doc(db, "config", "loja"), dadosParaSalvar, { merge: true });
      alert("Configurações atualizadas com sucesso! ✅");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações.");
    }
    setSalvando(false);
  }

  if (loading) return <div style={styles.center}>Carregando...</div>;

  return (
    <div style={styles.page}>
      <button onClick={() => router.back()} style={styles.btnBack}>⬅ Voltar ao Painel</button>
      
      <div style={styles.card}>
        <h2>⚙️ Configurações da Loja</h2>
        <p style={styles.sub}>Altere os dados básicos que aparecem para os clientes</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Chave PIX (Exibida no Checkout)</label>
          <input 
            type="text" 
            value={config.chavePix} 
            onChange={(e) => setConfig({...config, chavePix: e.target.value})}
            style={styles.input}
            placeholder="Sua chave aqui..."
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Valor do Frete Fixo (R$)</label>
          <input 
            type="text" 
            value={config.freteFixo} 
            onChange={(e) => setConfig({...config, freteFixo: formatMoneyInput(e.target.value)})}
            style={styles.input}
          />
          <small style={{color: '#94a3b8', fontSize: '11px'}}>Este valor será somado ao total do carrinho.</small>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Aviso em Destaque (Topo do Site)</label>
          <input 
            type="text" 
            placeholder="Ex: Frete grátis acima de R$ 200!"
            value={config.avisoDestaque} 
            onChange={(e) => setConfig({...config, avisoDestaque: e.target.value})}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Status da Loja</label>
          <select 
            value={config.lojaAberta} 
            onChange={(e) => setConfig({...config, lojaAberta: e.target.value === "true"})}
            style={styles.input}
          >
            <option value="true">🟢 Aberta para Pedidos</option>
            <option value="false">🔴 Em Recesso / Manutenção</option>
          </select>
        </div>

        <button 
          onClick={handleSalvar} 
          disabled={salvando} 
          style={salvando ? styles.btnDisabled : styles.btnSalvar}
        >
          {salvando ? "Salvando..." : "💾 Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "40px", background: "#f1f5f9", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "sans-serif" },
  btnBack: { alignSelf: "flex-start", marginBottom: "20px", background: "#64748b", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  card: { background: "#fff", padding: "30px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "500px" },
  sub: { color: "#64748b", fontSize: "14px", marginBottom: "25px" },
  inputGroup: { marginBottom: "20px" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#334155", marginBottom: "5px", display: "block" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "5px", fontSize: "16px", outline: "none" },
  btnSalvar: { width: "100%", padding: "15px", background: "#2ecc71", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", marginTop: "10px" },
  btnDisabled: { width: "100%", padding: "15px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "not-allowed", fontSize: "16px", marginTop: "10px" },
  center: { textAlign: "center", marginTop: "100px", fontSize: "18px", color: "#64748b" }
};