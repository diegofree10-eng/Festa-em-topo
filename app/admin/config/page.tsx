"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, query, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiMessageSquare, FiClock, FiBell, FiCalendar, FiActivity } from "react-icons/fi";

// --- IMPORTAÇÃO DOS MODAIS ---
import CupomModal from "@/app/admin/components/CupomModal";
import HorarioModal from "@/app/admin/components/HorarioModal";

const aplicarMascara = (valor: string, tipo: string) => {
  let v = valor.replace(/\D/g, "");
  if (tipo === 'cpf') {
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v.substring(0, 14);
  }
  if (tipo === 'tel') {
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    return v.substring(0, 15);
  }
  if (tipo === 'cep') {
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    return v.substring(0, 9);
  }
  return v;
};

export default function AdminConfig() {
  const [uid, setUid] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("pessoal");
  const [dadosAntigos, setDadosAntigos] = useState<any>({});
  const [contagemProdutos, setContagemProdutos] = useState(0);
  const [planosConfig, setPlanosConfig] = useState<any>(null);
  const [avisoPopup, setAvisoPopup] = useState<any>(null);
  const [msgHistoricoAberta, setMsgHistoricoAberta] = useState<any>(null);

  const [showCupomModal, setShowCupomModal] = useState(false);
  const [showHorarioModal, setShowHorarioModal] = useState(false);

  const [config, setConfig] = useState<any>({
    nomeResponsavel: "", cpfResponsavel: "", telefonePessoal: "", emailPessoal: "",
    nomeLoja: "", slug: "", logoUrl: "", instagram: "", whatsapp: "",
    cepOrigem: "", cidadeOrigem: "", ufOrigem: "", ruaOrigem: "", numeroOrigem: "", bairroOrigem: "",
    chavePix: "",
    mercadoPago: { publicKey: "", accessToken: "", ativo: false },
    lojaAberta: true,
    tokenMelhorEnvio: "",
    transportadoras: { correios: true, jadlog: true, azul: true, latam: true },
    cupons: {}, 
    plano: "Bronze",
    horarios: {},
    historicoMensagens: [] 
  });

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novaLogo, setNovaLogo] = useState<File | null>(null);

  useEffect(() => {
    const unsubPlanos = onSnapshot(doc(db, "configuracoes", "planos"), (docSnap) => {
      if (docSnap.exists()) setPlanosConfig(docSnap.data());
    });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        onSnapshot(doc(db, "lojistas", user.uid), (snap) => {
          if (snap.exists()) {
            const dados = snap.data();
            setDadosAntigos(dados);
            setConfig((prev: any) => ({ ...prev, ...dados }));

            if (dados.mensagemMaster && !dados.mensagemMaster.lida) {
                setAvisoPopup(dados.mensagemMaster);
            }
          }
          setLoading(false);
        });
        onSnapshot(query(collection(db, "lojistas", user.uid, "produtos")), (snap) => {
          setContagemProdutos(snap.size);
        });
      }
    });
    return () => { unsubPlanos(); unsubAuth(); };
  }, []);

  const confirmarLeituraMaster = async () => {
    if (!uid) return;
    try {
        await updateDoc(doc(db, "lojistas", uid), {
            "mensagemMaster.lida": true
        });
        setAvisoPopup(null);
    } catch (e) { console.error(e); }
  };

  const masterLiberou = (chaveTecnica: string) => {
    const meuPlano = config.plano || "Bronze";
    if (!planosConfig || !planosConfig[meuPlano]) return false;
    return planosConfig[meuPlano][chaveTecnica] === true;
  };

  const buscarCEP = async (cepRaw: string) => {
    const cepMascarado = aplicarMascara(cepRaw, 'cep');
    const value = cepMascarado.replace(/\D/g, "");
    setConfig((prev: any) => ({ ...prev, cepOrigem: cepMascarado }));
    if (value.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setConfig((prev: any) => ({
            ...prev,
            ruaOrigem: data.logradouro,
            bairroOrigem: data.bairro,
            cidadeOrigem: data.localidade,
            ufOrigem: data.uf
          }));
        }
      } catch (e) { console.error("Erro CEP"); }
    }
  };

  const handleSalvar = async () => {
    if (!uid) return;
    setSalvando(true);
    const dadosParaSalvar = { ...config, plano: dadosAntigos.plano, updatedAt: Date.now() };

    if (novaLogo) {
      const storageRef = ref(storage, `logos_lojistas/${uid}`);
      await uploadBytes(storageRef, novaLogo);
      dadosParaSalvar.logoUrl = await getDownloadURL(storageRef);
    }

    try {
      await setDoc(doc(db, "lojistas", uid), dadosParaSalvar, { merge: true });
      alert("Configurações salvas! ✅");
    } catch (e) { alert("Erro ao salvar."); }
    setSalvando(false);
  };

  if (loading) return <div style={styles.center}>Sincronizando...</div>;

  const canMP      = masterLiberou("temGateway");
  const canEnvio   = masterLiberou("temLogistica");
  const canCupons  = masterLiberou("temCupons");

  return (
    <div style={styles.page}>
      {avisoPopup && (
        <div style={styles.overlay}>
            <div style={styles.popupCard}>
                <div style={styles.popupHeader}><FiBell size={24} /> AVISO IMPORTANTE</div>
                <p style={styles.popupText}>{avisoPopup.texto}</p>
                <button onClick={confirmarLeituraMaster} style={styles.btnPopupConfirm}>OK, ESTOU CIENTE</button>
            </div>
        </div>
      )}

      {msgHistoricoAberta && (
        <div style={styles.overlay} onClick={() => setMsgHistoricoAberta(null)}>
            <div style={styles.popupCard} onClick={e => e.stopPropagation()}>
                <div style={{...styles.popupHeader, color: '#0f172a'}}><FiMessageSquare size={20} /> MENSAGEM ANTERIOR</div>
                <div style={{textAlign: 'left', marginBottom: '20px'}}>
                    <small style={{color: '#94a3b8', fontSize: '10px', fontWeight: '800'}}>DATA DO RECEBIMENTO:</small>
                    <div style={{fontSize: '13px', fontWeight: 'bold', color: '#64748b'}}>{new Date(msgHistoricoAberta.data).toLocaleString()}</div>
                </div>
                <p style={{...styles.popupText, textAlign: 'left', whiteSpace: 'pre-wrap'}}>{msgHistoricoAberta.texto}</p>
                <button onClick={() => setMsgHistoricoAberta(null)} style={{...styles.btnPopupConfirm, background: '#0f172a'}}>VOLTAR</button>
            </div>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={{fontSize: '22px', fontWeight: '800', marginBottom: '20px'}}>⚙️ Configurações</h2>

        {renderSeloPlano()}

        <div style={styles.tabBar}>
          <button style={abaAtiva === 'pessoal' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('pessoal')}>DADOS PESSOAIS</button>
          <button style={abaAtiva === 'loja' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('loja')}>DADOS DA LOJA</button>
          <button style={abaAtiva === 'pagamentos' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('pagamentos')}>PAGAMENTOS</button>
          <button style={abaAtiva === 'sistema' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('sistema')}>SISTEMA / CUPONS</button>
          <button style={abaAtiva === 'mensagens' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('mensagens')}>MENSAGENS</button>
        </div>

        {abaAtiva === 'pessoal' && (
          <section>
            <h3 style={styles.h3}>Identificação do Responsável</h3>
            <div style={styles.inputRow}>
              <div style={{flex: 2}}><label style={styles.label}>Nome Completo</label>
              <input style={styles.input} value={config.nomeResponsavel} onChange={e => setConfig({...config, nomeResponsavel: e.target.value})} /></div>
              <div style={{flex: 1}}><label style={styles.label}>CPF</label>
              <input style={styles.input} value={config.cpfResponsavel} onChange={e => setConfig({...config, cpfResponsavel: aplicarMascara(e.target.value, 'cpf')})} /></div>
            </div>
            <div style={{...styles.inputRow, marginTop: '15px'}}>
              <div style={{flex: 1}}><label style={styles.label}>E-mail Pessoal</label>
              <input style={styles.input} value={config.emailPessoal} onChange={e => setConfig({...config, emailPessoal: e.target.value})} /></div>
              <div style={{flex: 1}}><label style={styles.label}>Telefone</label>
              <input style={styles.input} value={config.telefonePessoal} onChange={e => setConfig({...config, telefonePessoal: aplicarMascara(e.target.value, 'tel')})} /></div>
            </div>
          </section>
        )}

        {abaAtiva === 'loja' && (
          <section>
            <h3 style={styles.h3}>Marca e Redes</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <div style={styles.previewLogo}>
                {novaLogo ? <img src={URL.createObjectURL(novaLogo)} style={styles.imgFull} /> : config.logoUrl ? <img src={config.logoUrl} style={styles.imgFull} /> : "LOGO"}
              </div>
              <input type="file" onChange={e => setNovaLogo(e.target.files?.[0] || null)} style={{fontSize: '11px'}} />
            </div>
            <div style={{marginBottom: '15px'}}>
                <label style={styles.label}>Nome da Loja</label>
                <input style={{...styles.input, background: '#f1f5f9'}} value={config.nomeLoja} readOnly />
                <label style={{...styles.label, marginTop: '10px'}}>Link da Loja</label>
                <div style={styles.slugBox}>
                  {`festaemtopo.com/${config.slug || 'seu-link'}`}
                </div>
            </div>
            <div style={styles.inputRow}>
              <div style={{flex: 1}}><label style={styles.label}>Instagram</label>
              <input style={styles.input} value={config.instagram} onChange={e => setConfig({...config, instagram: e.target.value})} /></div>
              <div style={{flex: 1}}><label style={styles.label}>WhatsApp Loja</label>
              <input style={styles.input} value={config.whatsapp} onChange={e => setConfig({...config, whatsapp: aplicarMascara(e.target.value, 'tel')})} /></div>
            </div>
            <h3 style={{...styles.h3, marginTop: '25px'}}>Endereço e Funcionamento</h3>
            <div style={styles.inputRow}>
              <div style={{width: '120px'}}><label style={styles.label}>CEP</label>
              <input style={styles.input} value={config.cepOrigem} onChange={e => buscarCEP(e.target.value)} /></div>
              <div style={{flex: 1}}><label style={styles.label}>Cidade</label>
              <input style={styles.input} value={config.cidadeOrigem} readOnly /></div>
            </div>
            <div style={{...styles.inputRow, marginTop: '10px'}}>
                <div style={{flex: 3}}><label style={styles.label}>Rua</label>
                <input style={styles.input} value={config.ruaOrigem} onChange={e => setConfig({...config, ruaOrigem: e.target.value})} /></div>
                <div style={{flex: 1}}><label style={styles.label}>Nº</label>
                <input style={styles.input} value={config.numeroOrigem} onChange={e => setConfig({...config, numeroOrigem: e.target.value})} /></div>
            </div>
            <button onClick={() => setShowHorarioModal(true)} style={{...styles.btnHorario, marginTop: '20px'}}>🕗 Configurar Horários</button>
          </section>
        )}

        {abaAtiva === 'pagamentos' && (
          <section>
            <h3 style={styles.h3}>Recebimento Manual</h3>
            <div style={{marginBottom: '25px'}}>
              <label style={styles.label}>Sua Chave PIX</label>
              <input style={styles.input} value={config.chavePix} onChange={e => setConfig({...config, chavePix: e.target.value})} placeholder="E-mail, CPF ou Celular" />
            </div>
            <h3 style={styles.h3}>Mercado Pago (Gateway)</h3>
            <div style={{
              background: !canMP ? '#fafafa' : config.mercadoPago.ativo ? '#f0f9ff' : '#f8fafc',
              padding: '20px', borderRadius: '15px', border: config.mercadoPago.ativo ? '1px solid #009ee3' : '1px solid #e2e8f0',
              opacity: !canMP ? 0.7 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{color: '#009ee3'}}>MERCADO PAGO</b>
                <input type="checkbox" disabled={!canMP} checked={config.mercadoPago.ativo} onChange={e => setConfig({...config, mercadoPago: {...config.mercadoPago, ativo: e.target.checked}})} />
              </div>
              {config.mercadoPago.ativo && canMP && (
                <div style={{marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <label style={styles.label}>Public Key</label>
                  <input style={styles.input} value={config.mercadoPago.publicKey} onChange={e => setConfig({...config, mercadoPago: {...config.mercadoPago, publicKey: e.target.value}})} />
                  <label style={styles.label}>Access Token</label>
                  <input style={styles.input} type="password" value={config.mercadoPago.accessToken} onChange={e => setConfig({...config, mercadoPago: {...config.mercadoPago, accessToken: e.target.value}})} />
                </div>
              )}
            </div>
          </section>
        )}

        {abaAtiva === 'sistema' && (
          <section>
            <h3 style={styles.h3}>Marketing</h3>
            <button disabled={!canCupons} onClick={() => setShowCupomModal(true)} style={canCupons ? styles.btnCupom : styles.btnDisabled}>
              {canCupons ? "🎟️ Gerenciar Cupons de Desconto" : "🔒 Cupons Bloqueados no Plano"}
            </button>

            <h3 style={{...styles.h3, marginTop: '25px'}}>Logística e Entrega</h3>
            <div style={{ opacity: canEnvio ? 1 : 0.6 }}>
                <label style={styles.label}>Token Melhor Envio</label>
                <input type="password" disabled={!canEnvio} value={config.tokenMelhorEnvio} onChange={e => setConfig({...config, tokenMelhorEnvio: e.target.value})} style={styles.input} />
            </div>

            {/* SEÇÃO DE TRANSPORTADORAS ADICIONADA ABAIXO DO TOKEN */}
            <div style={{ marginTop: '20px' }}>
                <label style={styles.label}>Transportadoras Ativas</label>
                {!canEnvio ? (
                   <div style={styles.lockNotice}>
                     🔒 Suporte a frete automático bloqueado no plano {config.plano}.
                   </div>
                ) : (
                  <div style={styles.gridTransp}>
                    {["azul", "correios", "jadlog", "latam"].map(t => (
                      <label key={t} style={styles.transpItem}>
                        <input 
                          type="checkbox" 
                          checked={!!(config.transportadoras && config.transportadoras[t])}
                          onChange={() => {
                            const novas = { 
                              ...(config.transportadoras || {}), 
                              [t]: !config.transportadoras?.[t] 
                            };
                            setConfig({...config, transportadoras: novas});
                          }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{t}</span>
                      </label>
                    ))}
                  </div>
                )}
            </div>

            <h3 style={{...styles.h3, marginTop: '25px'}}>Status da Loja</h3>
            <select style={styles.input} value={String(config.lojaAberta)} onChange={e => setConfig({...config, lojaAberta: e.target.value === "true"})}>
              <option value="true">🟢 ABERTA PARA PEDIDOS</option>
              <option value="false">🔴 VITRINE (CATÁLOGO)</option>
            </select>
          </section>
        )}

        {abaAtiva === 'mensagens' && (
          <section>
            <h3 style={styles.h3}>Mensagens do Administrador Master</h3>
            <div style={styles.msgContainer}>
              {(!config.historicoMensagens || config.historicoMensagens.length === 0) ? (
                <div style={styles.noMsg}>Nenhuma mensagem recebida no histórico.</div>
              ) : (
                config.historicoMensagens.sort((a: any, b: any) => b.data - a.data).map((msg: any) => (
                  <div key={msg.id} style={{...styles.msgItem, cursor: 'pointer'}} onClick={() => setMsgHistoricoAberta(msg)}>
                    <div style={styles.msgHeader}>
                      <span style={styles.msgTag}><FiMessageSquare /> MASTER</span>
                      <span style={styles.msgDate}><FiClock /> {new Date(msg.data).toLocaleDateString()}</span>
                    </div>
                    <p style={styles.msgText}>
                        {msg.texto.substring(0, 100)}{msg.texto.length > 100 ? "..." : ""}
                    </p>
                    <div style={{marginTop: '10px', fontSize: '9px', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase'}}>Clique para ler tudo</div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {abaAtiva !== 'mensagens' && (
            <button onClick={handleSalvar} disabled={salvando} style={salvando ? styles.btnDisabled : styles.btnSalvar}>
            {salvando ? "Salvando..." : "💾 Salvar Alterações"}
            </button>
        )}

        <CupomModal 
          show={showCupomModal} 
          onClose={() => setShowCupomModal(false)} 
          cupons={config.cupons} 
          setCupons={(n) => setConfig({...config, cupons: n})}
          limiteCupons={planosConfig?.[config.plano]?.categorias || 0} 
          planoAtivo={config.plano} 
        />
        <HorarioModal show={showHorarioModal} onClose={() => setShowHorarioModal(false)} horarios={config.horarios} setHorarios={(n) => setConfig({...config, horarios: n})} />
      </div>
    </div>
  );

  function renderSeloPlano() {
    const planoAtual = config.plano || "Bronze";
    const info = planosConfig?.[planoAtual] || { cor: "#94a3b8" };
    
    const hoje = new Date();
    const vencimento = config.dataVencimento ? new Date(config.dataVencimento) : null;
    const diffTime = vencimento ? vencimento.getTime() - hoje.getTime() : 0;
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
      <div style={{...styles.seloCard, border: `1px solid ${info.cor}40`}}>
        <div style={{...styles.medalhaBox, background: `${info.cor}15`}}>
          {info.medalhaUrl ? <img src={info.medalhaUrl} style={styles.imgFull} alt="Medalha" /> : "🏅"}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
             <span style={{ fontSize: '10px', fontWeight: '800', color: info.cor, textTransform: 'uppercase' }}>
               Plano {planoAtual}
             </span>
             {config.isTeste ? (
               <div style={styles.badgeTeste}>Periodo de Teste</div>
             ) : (
               <div style={styles.badgeAtivo}>Assinatura Ativa</div>
             )}
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <small style={styles.infoLabel}><FiCalendar size={10}/> CADASTRO</small>
              <span style={styles.infoValue}>
                {config.dataCadastro ? new Date(config.dataCadastro).toLocaleDateString('pt-BR') : '---'}
              </span>
            </div>

            <div style={styles.infoItem}>
              <small style={styles.infoLabel}><FiActivity size={10}/> MODELO</small>
              <span style={styles.infoValue}>
                {config.ciclo === 'anual' ? 'Anual' : 'Mensal'}
              </span>
            </div>

            <div style={styles.infoItem}>
              <small style={styles.infoLabel}><FiClock size={10}/> VENCIMENTO</small>
              <span style={{...styles.infoValue, color: diasRestantes <= 5 ? '#ef4444' : '#1e293b'}}>
                {config.dataVencimento ? new Date(config.dataVencimento).toLocaleDateString('pt-BR') : '---'}
                <small style={{marginLeft: '5px', fontSize: '9px', opacity: 0.7}}>
                  ({diasRestantes}d)
                </small>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const styles: any = {
  page: { padding: "40px 20px", background: "#f8fafc", minHeight: "100vh", display: "flex", justifyContent: "center" },
  card: { background: "#fff", padding: "35px", borderRadius: "24px", width: "100%", maxWidth: "750px", boxShadow: "0 10px 15px rgba(0,0,0,0.05)" },
  seloCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: '#fff', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  medalhaBox: { width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  badgeTeste: { background: '#fff7ed', color: '#c2410c', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #ffedd5' },
  badgeAtivo: { background: '#f0fdf4', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #dcfce7' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '5px' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  infoLabel: { fontSize: '9px', fontWeight: '800', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' },
  infoValue: { fontSize: '12px', fontWeight: '700', color: '#1e293b' },
  tabBar: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' },
  tabBtn: { padding: '12px', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', color: '#94a3b8', fontWeight: 'bold', fontSize: '11px', transition: '0.2s', whiteSpace: 'nowrap' },
  tabBtnActive: { padding: '12px', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '3px solid #2563eb', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold', fontSize: '11px', transition: '0.2s', whiteSpace: 'nowrap' },
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  inputRow: { display: 'flex', gap: '15px' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none' },
  previewLogo: { width: '60px', height: '60px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slugBox: { padding: '12px', background: '#f0f9ff', borderRadius: '10px', fontSize: '12px', color: '#0369a1', fontWeight: '800', border: '1px dashed #0ea5e9', textAlign: 'center' },
  btnHorario: { width: '100%', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  btnCupom: { width: '100%', padding: '15px', background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnSalvar: { width: "100%", padding: "16px", background: "#059669", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", marginTop: '30px' },
  btnDisabled: { width: "100%", padding: "16px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: "12px", cursor: "not-allowed", marginTop: '30px' },
  center: { textAlign: "center", marginTop: "100px" },
  msgContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' },
  noMsg: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' },
  msgItem: { background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' },
  msgHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  msgTag: { background: '#0f172a', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' },
  msgDate: { color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' },
  msgText: { fontSize: '14px', color: '#334155', lineHeight: '1.5' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  popupCard: { background: '#fff', padding: '30px', borderRadius: '24px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' },
  popupHeader: { fontSize: '14px', fontWeight: '900', color: '#3b82f6', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  popupText: { fontSize: '16px', color: '#475569', marginBottom: '30px', lineHeight: '1.6', fontWeight: '500' },
  btnPopupConfirm: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  
  // ESTILOS ADICIONADOS PARA AS TRANSPORTADORAS
  gridTransp: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' },
  transpItem: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' },
  lockNotice: { padding: '12px', background: '#fff1f2', color: '#be123c', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px' }
};