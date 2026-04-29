"use client";
import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase"; 
import { doc, setDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

export default function AdminConfig() {
  const [uid, setUid] = useState(null);
  const [config, setConfig] = useState({
    nomeLoja: "",
    slug: "", // Novo campo para o link da loja
    cpfResponsavel: "", // Novo campo para validação
    emailLoja: "",
    instagram: "",
    whatsapp: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    chavePix: "",
    freteFixo: "0,00",
    tokenMelhorEnvio: "",
    lojaAberta: true,
    logoUrl: "",
    transportadoras: { correios: true, jadlog: true, azul: true, latam: true },
    mercadoPago: { publicKey: "", accessToken: "", ativo: false }
  });
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novaLogo, setNovaLogo] = useState(null);
  const [isSlugAvailable, setIsSlugAvailable] = useState(true);

  // --- FUNÇÕES DE UTILIDADE ---

  const gerarSlug = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let cpfs = cpf.split('').map(el => +el);
    const rest = (count) => (cpfs.slice(0, count - 12).reduce((s, a, i) => s + a * (count - i), 0) * 10) % 11 % 10;
    return rest(10) === cpfs[9] && rest(11) === cpfs[10];
  };

  const formatMoneyInput = (value) => {
    let v = value.replace(/\D/g, "");
    v = (Number(v) / 100).toFixed(2);
    return v.replace(".", ",");
  };

  // --- MONITORAMENTO DE SLUG (LINK) ---
  useEffect(() => {
    const verificarLink = async () => {
      if (!config.nomeLoja) return;
      const novoSlug = gerarSlug(config.nomeLoja);
      setConfig(prev => ({ ...prev, slug: novoSlug }));

      if (novoSlug) {
        const q = query(collection(db, "lojistas"), where("slug", "==", novoSlug));
        const snap = await getDocs(q);
        // Disponível se estiver vazio ou se o slug já pertencer a este UID
        const disponivel = snap.empty || snap.docs.every(d => d.id === uid);
        setIsSlugAvailable(disponivel);
      }
    };

    const timer = setTimeout(verificarLink, 600);
    return () => clearTimeout(timer);
  }, [config.nomeLoja, uid]);

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const docRef = doc(db, "lojistas", user.uid);
        const unsubDoc = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const dados = snap.data();
            setConfig(prev => ({
              ...prev,
              ...dados,
              freteFixo: dados.frete ? ((dados.frete / 100).toFixed(2).replace(".", ",")) : "0,00",
              mercadoPago: dados.mercadoPago || { publicKey: "", accessToken: "", ativo: false },
              transportadoras: dados.transportadoras || { correios: true, jadlog: true, azul: true, latam: true }
            }));
          }
          setLoading(false);
        });
        return () => unsubDoc();
      }
    });
    return () => unsub();
  }, []);

  async function handleSalvar() {
    if (!uid) return;
    if (!validarCPF(config.cpfResponsavel)) return alert("CPF Inválido!");
    if (!isSlugAvailable) return alert("Este link de loja já está em uso!");

    setSalvando(true);
    
    let urlFinalLogo = config.logoUrl;
    if (novaLogo) {
      try {
        const storageRef = ref(storage, `logos_lojistas/${uid}`);
        await uploadBytes(storageRef, novaLogo);
        urlFinalLogo = await getDownloadURL(storageRef);
      } catch (err) { console.error(err); }
    }

    const valorNumerico = Number(config.freteFixo.replace(",", "."));
    const dadosParaSalvar = {
      ...config,
      frete: Math.round(valorNumerico * 100),
      logoUrl: urlFinalLogo,
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, "lojistas", uid), dadosParaSalvar, { merge: true });
      alert("Configurações atualizadas! ✅");
      setNovaLogo(null);
    } catch (e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  // --- ESTILOS DINÂMICOS ---
  const originalStyles = {
    section: { marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #f1f5f9" },
    bannerLink: {
        marginTop: '10px',
        padding: '12px',
        borderRadius: '10px',
        fontSize: '13px',
        backgroundColor: isSlugAvailable ? '#ecfdf5' : '#fef2f2',
        color: isSlugAvailable ? '#065f46' : '#991b1b',
        border: `1px solid ${isSlugAvailable ? '#10b981' : '#ef4444'}`
    }
  };

  if (loading) return <div style={styles.center}>Carregando configurações...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{fontSize: '22px', marginBottom: '20px', color: '#1e293b'}}>⚙️ Configurações Gerais</h2>

        {/* IDENTIDADE VISUAL */}
        <section style={originalStyles.section}>
          <h3 style={styles.h3}>Identidade da Loja</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
            <div style={styles.previewLogo}>
              {novaLogo ? <img src={URL.createObjectURL(novaLogo)} style={styles.imgFull} /> : 
               config.logoUrl ? <img src={config.logoUrl} style={styles.imgFull} /> : <span style={{fontSize: '10px', color: '#94a3b8'}}>SEM LOGO</span>}
            </div>
            <div style={{flex: 1}}>
                <label style={styles.label}>Alterar Logotipo</label>
                <input type="file" onChange={(e) => setNovaLogo(e.target.files[0])} style={{fontSize: '12px', marginTop: '5px'}} />
            </div>
          </div>

          <div style={styles.inputRow}>
            <div style={{flex: 1}}>
                <label style={styles.label}>Nome da Loja</label>
                <input type="text" placeholder="Ex: Minha Loja de Festas" value={config.nomeLoja} onChange={e => setConfig({...config, nomeLoja: e.target.value})} style={styles.input} />
                
                {/* Visualização do Link em Tempo Real */}
                {config.nomeLoja && (
                    <div style={originalStyles.bannerLink}>
                        <strong>Link da sua loja:</strong> internal-app.com/{config.slug}
                        <br/>
                        <span>{isSlugAvailable ? "✅ Link disponível" : "❌ Este link já pertence a outra loja"}</span>
                    </div>
                )}
            </div>
          </div>
        </section>

        {/* DADOS DO RESPONSÁVEL */}
        <section style={originalStyles.section}>
          <h3 style={styles.h3}>Dados Legais</h3>
          <div style={styles.inputRow}>
            <div style={{flex: 1}}>
                <label style={styles.label}>CPF do Responsável (Apenas números)</label>
                <input type="text" placeholder="000.000.000-00" value={config.cpfResponsavel} onChange={e => setConfig({...config, cpfResponsavel: e.target.value})} style={{...styles.input, borderColor: config.cpfResponsavel && !validarCPF(config.cpfResponsavel) ? 'red' : '#e2e8f0'}} />
                {config.cpfResponsavel && !validarCPF(config.cpfResponsavel) && <small style={{color: 'red'}}>CPF Inválido</small>}
            </div>
          </div>
        </section>

        {/* CONTATO E REDES */}
        <section style={originalStyles.section}>
          <h3 style={styles.h3}>Contato e Redes Sociais</h3>
          <div style={styles.inputRow}>
            <div style={{flex: 1}}>
                <label style={styles.label}>E-mail de Atendimento</label>
                <input type="email" placeholder="contato@loja.com" value={config.emailLoja} onChange={e => setConfig({...config, emailLoja: e.target.value})} style={styles.input} />
            </div>
            <div style={{flex: 1}}>
                <label style={styles.label}>Instagram (Usuário)</label>
                <input type="text" placeholder="Ex: festaemtopo" value={config.instagram} onChange={e => setConfig({...config, instagram: e.target.value})} style={styles.input} />
            </div>
          </div>
          <div style={{...styles.inputRow, marginTop: '10px'}}>
            <div style={{flex: 1}}>
                <label style={styles.label}>WhatsApp (DDD + Número)</label>
                <input type="text" placeholder="Ex: 11999998888" value={config.whatsapp} onChange={e => setConfig({...config, whatsapp: e.target.value})} style={styles.input} />
            </div>
            <div style={{flex: 1}}>
                <label style={styles.label}>Chave PIX (Manual)</label>
                <input type="text" placeholder="CPF, E-mail ou Celular" value={config.chavePix} onChange={e => setConfig({...config, chavePix: e.target.value})} style={styles.input} />
            </div>
          </div>
        </section>

        {/* ENDEREÇO COMPLETO */}
        <section style={originalStyles.section}>
          <h3 style={styles.h3}>Endereço da Loja (Origem do Frete)</h3>
          <div style={styles.inputRow}>
            <div style={{width: '140px'}}>
                <label style={styles.label}>CEP</label>
                <input type="text" placeholder="00000-000" value={config.cep} onChange={e => setConfig({...config, cep: e.target.value})} style={styles.input} />
            </div>
            <div style={{flex: 1}}>
                <label style={styles.label}>Cidade</label>
                <input type="text" placeholder="Nome da Cidade" value={config.cidade} onChange={e => setConfig({...config, cidade: e.target.value})} style={styles.input} />
            </div>
            <div style={{width: '60px'}}>
                <label style={styles.label}>UF</label>
                <input type="text" placeholder="SP" value={config.estado} onChange={e => setConfig({...config, estado: e.target.value.toUpperCase()})} style={styles.input} maxLength={2} />
            </div>
          </div>
          <div style={{...styles.inputRow, marginTop: '10px'}}>
            <div style={{flex: 1}}>
                <label style={styles.label}>Rua / Logradouro</label>
                <input type="text" placeholder="Ex: Av. Brasil" value={config.rua} onChange={e => setConfig({...config, rua: e.target.value})} style={styles.input} />
            </div>
            <div style={{width: '100px'}}>
                <label style={styles.label}>Número</label>
                <input type="text" placeholder="123" value={config.numero} onChange={e => setConfig({...config, numero: e.target.value})} style={styles.input} />
            </div>
          </div>
          <div style={{...styles.inputRow, marginTop: '10px'}}>
            <div style={{flex: 1}}>
                <label style={styles.label}>Bairro</label>
                <input type="text" placeholder="Nome do Bairro" value={config.bairro} onChange={e => setConfig({...config, bairro: e.target.value})} style={styles.input} />
            </div>
            <div style={{flex: 1}}>
                <label style={styles.label}>Frete Fixo Local (R$)</label>
                <input type="text" value={config.freteFixo} onChange={e => setConfig({...config, freteFixo: formatMoneyInput(e.target.value)})} style={styles.input} />
            </div>
          </div>
        </section>

        {/* MERCADO PAGO */}
        <section style={{...originalStyles.section, borderLeft: '4px solid #009ee3', paddingLeft: '15px', background: '#f0f9ff', padding: '15px', borderRadius: '0 12px 12px 0', borderBottom: 'none'}}>
          <h3 style={{...styles.h3, color: '#009ee3', marginTop: 0}}>Integração Mercado Pago</h3>
          <div style={{marginBottom: '10px'}}>
            <label style={styles.checkLabel}>
                <input type="checkbox" checked={config.mercadoPago.ativo} onChange={e => setConfig({...config, mercadoPago: {...config.mercadoPago, ativo: e.target.checked}})} />
                <b>Ativar Pagamentos via Mercado Pago</b>
            </label>
          </div>
          <div style={styles.inputRow}>
            <div style={{flex: 1}}>
                <label style={styles.label}>Public Key (Chave Pública)</label>
                <input type="text" placeholder="APP_USR-..." value={config.mercadoPago.publicKey} onChange={e => setConfig({...config, mercadoPago: {...config.mercadoPago, publicKey: e.target.value}})} style={styles.input} />
            </div>
          </div>
          <div style={{...styles.inputRow, marginTop: '10px'}}>
            <div style={{flex: 1}}>
                <label style={styles.label}>Access Token (Chave Privada)</label>
                <input type="password" placeholder="APP_USR-000000..." value={config.mercadoPago.accessToken} onChange={e => setConfig({...config, mercadoPago: {...config.mercadoPago, accessToken: e.target.value}})} style={styles.input} />
            </div>
          </div>
        </section>

        {/* MELHOR ENVIO */}
        <section style={{...originalStyles.section, borderLeft: '4px solid #2563eb', paddingLeft: '15px', marginTop: '20px'}}>
          <h3 style={{...styles.h3, color: '#2563eb'}}>Integração Melhor Envio</h3>
          <div style={styles.inputRow}>
            <div style={{flex: 1}}>
                <label style={styles.label}>Token de Acesso</label>
                <input type="password" placeholder="Cole aqui seu Token do Melhor Envio" value={config.tokenMelhorEnvio} onChange={e => setConfig({...config, tokenMelhorEnvio: e.target.value})} style={styles.input} />
            </div>
          </div>
          <label style={{...styles.label, marginTop: '15px', display: 'block'}}>Transportadoras que você aceita:</label>
          <div style={styles.gridTransp}>
            {Object.keys(config.transportadoras).map(t => (
              <label key={t} style={styles.checkLabel}>
                <input type="checkbox" checked={config.transportadoras[t]} onChange={() => setConfig({...config, transportadoras: {...config.transportadoras, [t]: !config.transportadoras[t]}})} />
                <span style={{textTransform:'capitalize', fontSize: '13px'}}>{t}</span>
              </label>
            ))}
          </div>
        </section>

        {/* STATUS DA LOJA */}
        <section style={{...originalStyles.section, border: 'none'}}>
          <label style={styles.label}>Situação Atual do Catálogo</label>
          <select value={config.lojaAberta} onChange={(e) => setConfig({...config, lojaAberta: e.target.value === "true"})} style={{...styles.input, marginTop: '5px', fontWeight: 'bold'}}>
            <option value="true">🟢 LOJA ABERTA (Receber Pedidos)</option>
            <option value="false">🔴 LOJA EM MANUTENÇÃO (Apenas Vitrine)</option>
          </select>
        </section>

        <button 
            onClick={handleSalvar} 
            disabled={salvando || !isSlugAvailable || (config.cpfResponsavel && !validarCPF(config.cpfResponsavel))} 
            style={salvando || !isSlugAvailable ? styles.btnDisabled : styles.btnSalvar}
        >
          {salvando ? "Processando..." : "💾 Salvar Configurações da Loja"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "40px 20px", background: "#f8fafc", minHeight: "100vh", display: "flex", justifyContent: "center" },
  card: { background: "#fff", padding: "35px", borderRadius: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", width: "100%", maxWidth: "700px", height: 'fit-content' },
  h3: { fontSize: "14px", fontWeight: "800", color: "#475569", marginBottom: "15px", textTransform: 'uppercase', letterSpacing: '0.5px' },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  inputRow: { display: 'flex', gap: '15px', alignItems: 'flex-start' },
  input: { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", color: "#1e293b", outline: 'none', transition: 'border 0.2s', background: '#fff' },
  gridTransp: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', color: '#334155' },
  previewLogo: { width: '65px', height: '65px', borderRadius: '14px', background: '#f1f5f9', overflow: 'hidden', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  btnSalvar: { width: "100%", padding: "18px", background: "#059669", color: "#fff", border: "none", borderRadius: "14px", fontWeight: "bold", cursor: "pointer", fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginTop: '10px' },
  btnDisabled: { width: "100%", padding: "18px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: "14px", fontWeight: "bold", cursor: "not-allowed", marginTop: '10px' },
  center: { textAlign: "center", marginTop: "100px", color: "#64748b", fontFamily: 'sans-serif' }
};