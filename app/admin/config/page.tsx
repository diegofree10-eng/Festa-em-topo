"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, query, orderBy, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiMessageSquare, FiClock, FiBell, FiCalendar, FiActivity, FiImage, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import UpgradeModal from "@/app/admin/components/UpgradeModal";
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
  if (tipo === 'cnpj') {
    v = v.replace(/(\d{2})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1/$2");
    v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    return v.substring(0, 18);
  }
  if (tipo === 'dinheiro') {
    if (!v) return "";
    const numero = (parseInt(v, 10) / 100).toFixed(2);
    return numero.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
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
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [showToken, setShowToken] = useState(false);

  const [showCupomModal, setShowCupomModal] = useState(false);
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [unsubMensagens, setUnsubMensagens] = useState<any>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [config, setConfig] = useState<any>({
    dadosPessoais: { dsNomeResponsavel: "", dsCpfResponsavel: "", dsEmailResponsavel: "", dsRuaResponsavel: "", nrNumeroResponsavel: "", dsBairroResponsavel: "", dsCidadeResponsavel: "", dsUfResponsavel: "", dsCepResponsavel: "", dsTelResponsavel: "", dsRole: "" },
    dadosLoja: { dsNomeLoja: "Nova Loja", dsRuaLoja: "", nrNumeroLoja: "", dsCepLoja: "", dsBairroLoja: "", dsCidadeLoja: "", dsUfLoja: "", nrCnpjCpfLoja: "", dsStatusLoja: "ativo", dsPlanoLoja: "Bronze", nrWhatssapLoja: "", dsSeguimentoLoja: "", dsSlug: "", dsLogoLoja: "", redesSociais: [] },
    banners: { dsDesktop: [], dsMobile: [], dsBanner1: "", dsBanner2: "", dsBanner3: "", dsLinkBanner1: "", dsLinkBanner2: "", dsLinkBanner3: "" },
    pagamentos: { dsChavePix: "", dsMercadoPago: { publicKey: "", accessToken: "", ativo: false }, dsPagSeguro: { token: "", email: "", ativo: false } },
    aparencia: { dscorFundo: "#f8fafc", dscorPrincipal: "#FF8C00", dscorSecundaria: "#F5F5DC", dscorTextoCard: "#1e293b" },
    sistema: { isFreteGratisAtivo: false, vlFreteGratisMinimo: 0, dsTokenMelhorEnvio: "", dstransportadoras: { correios: true, jadlog: true, azul: true, latam: true }, cupons: {}, horarios: {}, isLojaAberta: true },
    historicoMensagens: [],
    financeiro: { vlLucroReal: 0, vlMetaFaturamentoMensal: 0, vlTicketMedio: 0 },
    redesSociais: []
  });

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novaLogo, setNovaLogo] = useState<File | null>(null);

  const [arquivoBanner1, setArquivoBanner1] = useState<File | null>(null);
  const [arquivoBanner2, setArquivoBanner2] = useState<File | null>(null);
  const [arquivoBanner3, setArquivoBanner3] = useState<File | null>(null);

  useEffect(() => {
    const unsubMensagens = onSnapshot(
      query(
        collection(db, "lojistas", uid || "none", "mensagens"),
        orderBy("dataEnvio", "desc") // MUDOU DE "data" PARA "dataEnvio"
      ),
      (snap) => {
        const mensagens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConfig((prev: any) => ({ ...prev, historicoMensagens: mensagens }));
      }
    );

    const unsubPlanos = onSnapshot(doc(db, "configuracoes", "planos"), (docSnap) => {
      if (docSnap.exists()) setPlanosConfig(docSnap.data());
    });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const carregarDadosConfiguracao = async () => {
          try {
            const snap = await getDoc(doc(db, "lojistas", user.uid));
            if (snap.exists()) {
              const dados = snap.data();
              setDadosAntigos(dados);
              setConfig((prev: any) => ({ ...prev, ...dados }));
              if (dados.mensagemMaster && !dados.mensagemMaster.lida) setAvisoPopup(dados.mensagemMaster);
            }
          } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        carregarDadosConfiguracao();

        const unsubCategorias = onSnapshot(query(collection(db, "lojistas", user.uid, "categorias"), orderBy("nome", "asc")), (snap) => {
          setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubProdutos = onSnapshot(query(collection(db, "lojistas", user.uid, "produtos")), (snap) => {
          setContagemProdutos(snap.size);
        });
        return () => { unsubCategorias(); unsubProdutos(); };
      }
    });

    return () => { unsubPlanos(); unsubAuth(); unsubMensagens(); };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "lojistas", uid, "assinaturas"),
      orderBy("tsAssinaturaLojista", "desc") // <--- Garante o histórico organizado
    );

    const unsubAssinaturas = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConfig((prev: any) => ({ ...prev, historicoPagamentos: lista }));
    });

    return () => unsubAssinaturas();
  }, [uid]);

  const tratarLinkRede = (plataforma: string, url: string) => {
    if (!url) return "";
    // Adiciona https:// se não tiver
    let link = url.startsWith("http") ? url : `https://${url}`;

    // Opcional: Aqui você pode colocar regras específicas por plataforma
    // Ex: se for instagram, garantir que não tenha caracteres proibidos
    return link;
  };

  const buscarCep = async (cep: string, tipo: 'loja' | 'pessoal') => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        if (tipo === 'loja') {
          setConfig(prev => ({
            ...prev,
            dadosLoja: {
              ...prev.dadosLoja,
              dsRuaLoja: data.logradouro,
              dsBairroLoja: data.bairro,
              dsCidadeLoja: data.localidade,
              dsUfLoja: data.uf
            }
          }));
        } else {
          setConfig(prev => ({
            ...prev,
            dadosPessoais: {
              ...prev.dadosPessoais,
              dsRuaResponsavel: data.logradouro,
              dsBairroResponsavel: data.bairro,
              dsCidadeResponsavel: data.localidade,
              dsUfResponsavel: data.uf
            }
          }));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const handleSalvar = async () => {
    if (!uid) return;

    // --- VALIDAÇÃO DE OBRIGATORIEDADE ---
    const dP = config.dadosPessoais;
    const dL = config.dadosLoja;

    const camposObrigatorios = [
      { valor: dP.dsNomeResponsavel, nome: "Nome do Responsável" },
      { valor: dP.dsCpfResponsavel, nome: "CPF" },
      { valor: dP.dsEmailResponsavel, nome: "E-mail Pessoal" },
      { valor: dP.dsTelResponsavel, nome: "Telefone" },
      { valor: dP.dsRuaResponsavel, nome: "Rua do Responsável" },
      //{ valor: dL.dsNomeLoja, nome: "Nome da Loja" },
      //{ valor: dL.nrCnpjCpfLoja, nome: "CNPJ/CPF da Loja" },
      { valor: dL.dsRuaLoja, nome: "Rua da Loja" },
      { valor: dL.dsCepLoja, nome: "CEP da Loja" },
      { valor: dL.dsCidadeLoja, nome: "Cidade da Loja" }
    ];

    const campoVazio = camposObrigatorios.find(c => !c.valor || c.valor.toString().trim() === "");

    if (campoVazio) {
      alert(`⚠️ Por favor, preencha o campo obrigatório: ${campoVazio.nome}`);
      return;
    }

    setSalvando(true);

    const redesFormatadas = config.redesSociais.map((r: any) => ({
      ...r,
      url: tratarLinkRede(r.plataforma, r.url)
    }));

    const dadosParaSalvar = {
      ...config,
      redesSociais: redesFormatadas,
      updatedAt: Date.now()
    };

    try {
      if (novaLogo) {
        const storageRef = ref(storage, `logos_lojistas/${uid}`);
        await uploadBytes(storageRef, novaLogo);
        dadosParaSalvar.dadosLoja.dsLogoLoja = await getDownloadURL(storageRef);
      }

      const salvarBanner = async (arquivo: File | null, campo: string) => {
        if (!arquivo) return null;
        const blob = await comprimirImagem(arquivo);
        const refB = ref(storage, `banners/${uid}/${campo}.jpg`);
        await uploadBytes(refB, blob);
        return await getDownloadURL(refB);
      };

      if (arquivoBanner1) dadosParaSalvar.banners.dsBanner1 = await salvarBanner(arquivoBanner1, 'banner1');
      if (arquivoBanner2) dadosParaSalvar.banners.dsBanner2 = await salvarBanner(arquivoBanner2, 'banner2');
      if (arquivoBanner3) dadosParaSalvar.banners.dsBanner3 = await salvarBanner(arquivoBanner3, 'banner3');

      await setDoc(doc(db, "lojistas", uid), dadosParaSalvar, { merge: true });
      setDadosAntigos(dadosParaSalvar);
      alert("Configurações salvas com sucesso! ✅");
      setArquivoBanner1(null); setArquivoBanner2(null); setArquivoBanner3(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  }; // <--- Esta chave fecha a função handleSalvar

  // ... coloque esta função perto das outras funções (handleSalvar, etc.)
  const solicitarUpgrade = async (novoPlano: string) => {
    if (!uid) return;

    try {
      const subColRef = collection(db, "lojistas", uid, "assinaturas", "registro_inicial", "up_upgrade");

      await addDoc(subColRef, {
        tsDataSolicitacao: new Date(),
        dsLojaId: uid,
        dsLojaNome: config.dadosLoja.dsNomeLoja || "Loja Sem Nome",
        dsPlanoAtual: config.dadosLoja.dsPlanoLoja || "Bronze",
        dsPlanoDesejado: novoPlano,
        dsStatusUpgrade: "pendente" // Agora está no padrão!
      });

      // ATUALIZAÇÃO DA FLAG NO DOCUMENTO PRINCIPAL
      await updateDoc(doc(db, "lojistas", uid), {
        "sistema.dsStatusUpgrade": "pendente"
      });

      alert("Solicitação de upgrade enviada com sucesso!");
      setShowUpgradeModal(false);
    } catch (error) {
      console.error("Erro ao solicitar upgrade:", error);
      alert("Erro ao enviar solicitação.");
    }
  };
  // --- FUNÇÕES AUXILIARES ---
  const confirmarLeituraMaster = async () => {
    if (!uid) return;
    try {
      setAvisoPopup(null);
      await updateDoc(doc(db, "lojistas", uid), { "mensagemMaster.lida": true });
    } catch (error) { console.error(error); }
  };

  const confirmarLeituraMensagem = async (msgId: string) => {
    if (!uid) return;
    try {
      const msgRef = doc(db, "lojistas", uid, "mensagens", msgId);
      await updateDoc(msgRef, { lida: true });
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };


  const masterLiberouMeioPagamento = (nomeGateway: "mercado_pago" | "pagseguro") => {
    const meuPlano = config.dadosLoja.dsPlanoLoja || "Bronze";
    if (!planosConfig || !planosConfig[meuPlano]) return false;
    const liberadosNoPlano = planosConfig[meuPlano].meios_pagamento;
    if (Array.isArray(liberadosNoPlano)) {
      return liberadosNoPlano.includes(nomeGateway);
    }
    return false;
  };

  const masterLiberou = (chaveTecnica: string) => {
    // 1. Determina o plano vigente:
    // Se 'dsPlanoTeste' for "Ouro", ele ganha o Ouro, ignorando o plano base.
    // Caso contrário, usa o plano padrão da loja.
    const planoVigente = config.sistema?.dsPlanoTeste === "Ouro"
      ? "Ouro"
      : (config.dadosLoja?.dsPlanoLoja || "Bronze");

    // 2. Valida contra as permissões carregadas do Firestore
    if (!planosConfig || !planosConfig[planoVigente]) return false;

    return planosConfig[planoVigente][chaveTecnica] === true;
  };

  const comprimirImagem = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const MAX_WIDTH = 1500;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(); }, "image/jpeg", 0.7);
        };
      };
    });
  };

  // --- FUNÇÕES DE GERENCIAMENTO DE REDES SOCIAIS ---
  const adicionarRedeSocial = () => {
    const novasRedes = [...(config.dadosLoja.redesSociais || []), { plataforma: 'instagram', url: '' }];
    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, redesSociais: novasRedes } });
  };

  const atualizarRedeSocial = (index: number, campo: string, valor: string) => {
    const novasRedes = [...(config.dadosLoja.redesSociais || [])];
    novasRedes[index] = { ...novasRedes[index], [campo]: valor };
    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, redesSociais: novasRedes } });
  };

  const removerRedeSocial = (index: number) => {
    const novasRedes = config.dadosLoja.redesSociais.filter((_: any, i: number) => i !== index);
    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, redesSociais: novasRedes } });
  };

  function renderSeloPlano() {
    const isOuroAtivo = config.sistema?.dsPlanoTeste === "Ouro";
    const planoBase = config.dadosLoja?.dsPlanoLoja || "Bronze";
    const planoExibido = isOuroAtivo ? "Ouro" : planoBase;

    // Informações visuais baseadas no plano original da loja
    const info = planosConfig?.[planoBase] || { cor: "#94a3b8" };

    // Datas
    const tsVencimento = isOuroAtivo ? config.sistema?.tsVencimentoTeste : config.dadosLoja?.tsVencimentoLoja;
    const dataVencimento = tsVencimento?.seconds ? new Date(tsVencimento.seconds * 1000) : null;
    const dataCriacao = config.dadosLoja?.tsCriacaoLoja?.seconds ? new Date(config.dadosLoja.tsCriacaoLoja.seconds * 1000) : null;

    const hoje = new Date();
    const diasRestantes = dataVencimento ? Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const estaVencendo = diasRestantes <= 5;

    return (
      <div style={{
        ...styles.seloCard,
        border: `1px solid ${isOuroAtivo ? '#d97706' : info.cor + '40'}`,
        background: estaVencendo ? '#fef2f2' : '#fff'
      }}>
        {/* Selo original da loja (Bronze/Prata/Ouro) */}
        <div style={{ ...styles.medalhaBox, background: `${info.cor}15` }}>
          {info.medalhaUrl ? <img src={info.medalhaUrl} style={styles.imgFull} /> : "🏅"}
        </div>

        <div style={{ flex: 1, marginLeft: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: info.cor, textTransform: 'uppercase' }}>
                Plano {planoBase}
              </span>
              {isOuroAtivo && (
                <span style={{ marginLeft: '8px', fontSize: '9px', background: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  PERÍODO DE TESTE OURO
                </span>
              )}
            </div>
            <span style={{ fontSize: '10px', fontWeight: '800', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              {config.dadosLoja?.ciclo || 'mensal'}
            </span>
          </div>

          <div style={{ ...styles.infoGrid, gridTemplateColumns: '1fr 1fr 1fr', marginTop: '10px' }}>
            <div style={styles.infoItem}>
              <small style={styles.infoLabel}>Criação</small>
              <span style={styles.infoValue}>{dataCriacao?.toLocaleDateString('pt-BR') || '---'}</span>
            </div>



            <div style={styles.infoItem}>
              <small style={styles.infoLabel}>{isOuroAtivo ? "Fim do Teste Plano Ouro" : "Vencimento"}</small>
              <span style={{ ...styles.infoValue, color: estaVencendo ? '#ef4444' : '#1e293b', fontWeight: estaVencendo ? '900' : '700' }}>
                {dataVencimento?.toLocaleDateString('pt-BR') || '---'}
              </span>
            </div>

            <div style={styles.infoItem}>
              <small style={styles.infoLabel}>Status</small>
              <span style={{ ...styles.infoValue, color: estaVencendo ? '#ef4444' : '#10b981', fontWeight: '800' }}>
                {estaVencendo ? `Vence em ${diasRestantes}d!` : "Em dia"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (loading) return <div style={styles.center}>Sincronizando...</div>;

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
            <div style={{ ...styles.popupHeader, color: '#0f172a' }}><FiMessageSquare size={20} /> MENSAGEM ANTERIOR</div>
            <p style={{ ...styles.popupText, textAlign: 'left', whiteSpace: 'pre-wrap' }}>{msgHistoricoAberta.texto}</p>
            <button onClick={() => setMsgHistoricoAberta(null)} style={{ ...styles.btnPopupConfirm, background: '#0f172a' }}>VOLTAR</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px' }}>⚙️ Configurações</h2>
        {renderSeloPlano()}

        <div style={styles.tabBar}>
          <button style={abaAtiva === 'pessoal' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('pessoal')}>DADOS PESSOAIS</button>
          <button style={abaAtiva === 'loja' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('loja')}>DADOS DA LOJA</button>
          <button style={abaAtiva === 'banner' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('banner')}>BANNERS</button>
          <button style={abaAtiva === 'pagamentos' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('pagamentos')}>PAGAMENTOS</button>
          <button style={abaAtiva === 'aparencia' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('aparencia')}>APARÊNCIA</button>
          <button style={abaAtiva === 'sistema' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('sistema')}>SISTEMA / CUPONS</button>
          <button style={abaAtiva === 'mensagens' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('mensagens')}>MENSAGENS</button>
          <button style={abaAtiva === 'assinatura' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('assinatura')}>ASSINATURA</button>
        </div>

        {/* --- SEÇÕES DAS ABAS --- */}
        {abaAtiva === 'pessoal' && (
          <section>
            <h3 style={styles.h3}>Identificação do Responsável</h3>
            <div style={styles.inputRow}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Nome Completo</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsNomeResponsavel || ""}
                  onChange={e => setConfig({
                    ...config,
                    dadosPessoais: { ...config.dadosPessoais, dsNomeResponsavel: e.target.value }
                  })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>CPF</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsCpfResponsavel || ""}
                  onChange={e => setConfig({
                    ...config,
                    dadosPessoais: { ...config.dadosPessoais, dsCpfResponsavel: aplicarMascara(e.target.value, 'cpf') }
                  })}
                />
              </div>
            </div>

            <div style={{ ...styles.inputRow, marginTop: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>E-mail Pessoal</label>
                <input
                  required
                  type="email"
                  style={styles.input}
                  value={config.dadosPessoais.dsEmailResponsavel || ""}
                  onChange={e => setConfig({
                    ...config,
                    dadosPessoais: { ...config.dadosPessoais, dsEmailResponsavel: e.target.value }
                  })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Telefone</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsTelResponsavel || ""}
                  onChange={e => setConfig({
                    ...config,
                    dadosPessoais: { ...config.dadosPessoais, dsTelResponsavel: aplicarMascara(e.target.value, 'tel') }
                  })}
                />
              </div>
            </div>

            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Endereço do Responsável</h3>


            {/* Linha 1: Rua / Número / CEP (Apontando para dadosPessoais) */}
            <div style={{ ...styles.inputRow, marginTop: '10px' }}>
              <div style={{ flex: 3 }}>
                <label style={styles.label}>Rua *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsRuaResponsavel || ""}
                  onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsRuaResponsavel: e.target.value } })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nº *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.nrNumeroResponsavel || ""}
                  onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, nrNumeroResponsavel: e.target.value } })}
                />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={styles.label}>CEP *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsCepResponsavel || ""}
                  onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsCepResponsavel: aplicarMascara(e.target.value, 'cep') } })}
                  onBlur={e => buscarCep(e.target.value, 'pessoal')} // Corrigido para 'pessoal'
                />
              </div>
            </div>

            {/* Linha 2: Bairro / Cidade / UF (Apontando para dadosPessoais) */}
            <div style={{ ...styles.inputRow, marginTop: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Bairro *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsBairroResponsavel || ""}
                  onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsBairroResponsavel: e.target.value } })}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Cidade *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosPessoais.dsCidadeResponsavel || ""}
                  onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsCidadeResponsavel: e.target.value } })}
                />
              </div>
              <div style={{ flex: 0.5 }}>
                <label style={styles.label}>UF *</label>
                <input
                  required
                  maxLength={2}
                  style={styles.input}
                  value={config.dadosPessoais.dsUfResponsavel || ""}
                  onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsUfResponsavel: e.target.value.toUpperCase() } })}
                />
              </div>
            </div>
          </section>
        )}

        {abaAtiva === 'loja' && (
          <section>
            <h3 style={styles.h3}>Marca e Redes Sociais</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <div style={styles.previewLogo}>
                {novaLogo ? <img src={URL.createObjectURL(novaLogo)} style={styles.imgFull} /> : config.dadosLoja.dsLogoLoja ? <img src={config.dadosLoja.dsLogoLoja} style={styles.imgFull} /> : "LOGO"}
              </div>
              <input type="file" onChange={e => setNovaLogo(e.target.files?.[0] || null)} style={{ fontSize: '11px' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>Segmento da Loja (Ramo) *</label>
              <select
                required
                style={styles.input}
                value={["festas", "confeitaria", "papelaria", "decoracao", "roupas"].includes(config.dadosLoja.dsSeguimentoLoja)
                  ? config.dadosLoja.dsSeguimentoLoja
                  : (config.dadosLoja.dsSeguimentoLoja !== "" ? "Outros" : "")}
                onChange={e => {
                  const val = e.target.value;
                  if (val !== "Outros") {
                    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: val } });
                  } else {
                    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: "OUTROS_MODE" } });
                  }
                }}
              >
                <option value="">Selecione o ramo...</option>
                <option value="festas">Artigos para Festas</option>
                <option value="confeitaria">Confeitaria e Doces</option>
                <option value="papelaria">Papelaria Criativa</option>
                <option value="decoracao">Decoração de Eventos</option>
                <option value="roupas">Vestuário e Acessórios</option>
                <option value="Outros">Outros (digitar abaixo)</option>
              </select>
            </div>

            {!["festas", "confeitaria", "papelaria", "decoracao", "roupas", ""].includes(config.dadosLoja.dsSeguimentoLoja) && (
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.label}>Qual o seu segmento? *</label>
                <input
                  required
                  style={styles.input}
                  placeholder="Ex: Pet Shop, Artesanato, etc."
                  value={config.dadosLoja.dsSeguimentoLoja === "OUTROS_MODE" ? "" : config.dadosLoja.dsSeguimentoLoja}
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: e.target.value } })}
                />
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={styles.label}>Minhas Redes Sociais</label>
                <button onClick={adicionarRedeSocial} style={styles.btnAdicionarSocial}>+ Adicionar</button>
              </div>
              {config.dadosLoja.redesSociais?.map((rede: any, index: number) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                  <select style={{ ...styles.input, flex: 1 }} value={rede.plataforma} onChange={e => atualizarRedeSocial(index, 'plataforma', e.target.value)}>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="site">Site Próprio</option>
                  </select>
                  <input style={{ ...styles.input, flex: 2 }} value={rede.url || ""} onChange={e => atualizarRedeSocial(index, 'url', e.target.value)} />
                  <button onClick={() => removerRedeSocial(index)} style={styles.btnRemoveSocial}><FiTrash2 /></button>
                </div>
              ))}
            </div>

            <div style={styles.inputRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>WhatsApp Loja *</label>
                <input required style={styles.input} value={config.dadosLoja.nrWhatssapLoja || ""} onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, nrWhatssapLoja: aplicarMascara(e.target.value, 'tel') } })} />
              </div>
            </div>

            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Endereço da Loja</h3>

            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                style={{ marginRight: '10px' }}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfig({
                      ...config,
                      dadosLoja: {
                        ...config.dadosLoja,
                        dsRuaLoja: config.dadosPessoais.dsRuaResponsavel,
                        nrNumeroLoja: config.dadosPessoais.nrNumeroResponsavel,
                        dsCepLoja: config.dadosPessoais.dsCepResponsavel,
                        dsCidadeLoja: config.dadosPessoais.dsCidadeResponsavel,
                        dsUfLoja: config.dadosPessoais.dsUfResponsavel,
                        dsBairroLoja: config.dadosPessoais.dsBairroResponsavel
                      }
                    });
                  }
                }}
              />
              <span>A loja fica no mesmo endereço da minha residência</span>
            </label>

            {/* Linha 1: Rua / Número / CEP */}
            <div style={{ ...styles.inputRow, marginTop: '10px' }}>
              <div style={{ flex: 3 }}>
                <label style={styles.label}>Rua *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosLoja.dsRuaLoja || ""}
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsRuaLoja: e.target.value } })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nº *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosLoja.nrNumeroLoja || ""}
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, nrNumeroLoja: e.target.value } })}
                />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={styles.label}>CEP *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosLoja.dsCepLoja || ""}
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsCepLoja: aplicarMascara(e.target.value, 'cep') } })}
                  onBlur={e => buscarCep(e.target.value, 'loja')}
                />
              </div>
            </div>

            {/* Linha 2: Bairro / Cidade / UF */}
            <div style={{ ...styles.inputRow, marginTop: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Bairro *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosLoja.dsBairroLoja || ""} // AQUI ESTÁ A VARIÁVEL CORRETA
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsBairroLoja: e.target.value } })}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Cidade *</label>
                <input
                  required
                  style={styles.input}
                  value={config.dadosLoja.dsCidadeLoja || ""}
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsCidadeLoja: e.target.value } })}
                />
              </div>
              <div style={{ flex: 0.5 }}>
                <label style={styles.label}>UF *</label>
                <input
                  required
                  maxLength={2}
                  style={styles.input}
                  value={config.dadosLoja.dsUfLoja || ""}
                  onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsUfLoja: e.target.value.toUpperCase() } })}
                />
              </div>
            </div>
            <button onClick={() => setShowHorarioModal(true)} style={{ ...styles.btnHorario, marginTop: '20px' }}>🕗 Configurar Horários</button>
          </section>
        )}

        {abaAtiva === 'banner' && (
          <section>
            <h3 style={styles.h3}>Banners do Carrossel (Início)</h3>
            <p style={styles.helpText}>Utilize imagens de <b>1500x600 pixels</b>. Vincule o banner a uma categoria para redirecionamento automático.</p>
            <div style={styles.bannerGrid}>
              {[1, 2, 3].map((num) => {
                // Mapeia o número para o nome exato da variável na "gaveta" banners
                const campoBanner = `dsBanner${num}` as keyof typeof config.banners;
                const linkCampo = `dsLinkBanner${num}` as keyof typeof config.banners;

                const arquivo = num === 1 ? arquivoBanner1 : num === 2 ? arquivoBanner2 : arquivoBanner3;
                const setArquivo = num === 1 ? setArquivoBanner1 : num === 2 ? setArquivoBanner2 : setArquivoBanner3;

                return (
                  <div key={num} style={styles.bannerField}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={styles.label}>Banner {num}</label>
                    </div>

                    <div style={styles.bannerPreview}>
                      {arquivo ? (
                        <img src={URL.createObjectURL(arquivo)} style={styles.imgFull} />
                      ) : config.banners[campoBanner] ? (
                        <img src={config.banners[campoBanner]} style={styles.imgFull} />
                      ) : (
                        <FiImage size={30} color="#cbd5e1" />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <label style={styles.uploadTrigger}>
                        <FiUploadCloud /> {arquivo ? "Trocar Imagem" : "Escolher Imagem"}
                        <input type="file" accept="image/*" hidden onChange={e => setArquivo(e.target.files?.[0] || null)} />
                      </label>

                      <div style={{ position: 'relative' }}>
                        <select
                          style={{ ...styles.input, fontSize: '12px', padding: '10px' }}
                          value={config.banners[linkCampo] || ""}
                          onChange={e => setConfig({
                            ...config,
                            banners: { ...config.banners, [linkCampo]: e.target.value }
                          })}
                        >
                          <option value="">Sem link (Categoria Alvo)</option>
                          {listaCategorias.map(cat => (
                            <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        )}

        {abaAtiva === 'pagamentos' && (
          <section>
            <h3 style={styles.h3}>Recebimento Manual</h3>
            <div style={{ marginBottom: '25px' }}>
              <label style={styles.label}>Sua Chave PIX</label>
              <input
                style={styles.input}
                value={config.pagamentos.dsChavePix}
                onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsChavePix: e.target.value } })}
                placeholder="E-mail, CPF ou Celular"
              />
            </div>

            <h3 style={styles.h3}>Gateways de Checkout Ativos</h3>
            <p style={styles.helpText}>Habilite as chaves do intermediador que você possui conta ativa. O recebimento online depende do seu plano contratado.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* MERCADO PAGO - Só aparece se estiver liberado no plano */}
              {masterLiberouMeioPagamento("mercado_pago") && (
                <div style={{
                  background: config.pagamentos.dsMercadoPago.ativo ? '#f0f9ff' : '#f8fafc',
                  padding: '20px',
                  borderRadius: '15px',
                  border: config.pagamentos.dsMercadoPago.ativo ? '1px solid #009ee3' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ color: '#009ee3', fontSize: '13px' }}>MERCADO PAGO Checkout</b>
                    <input
                      type="checkbox"
                      checked={!!config.pagamentos.dsMercadoPago.ativo}
                      onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsMercadoPago: { ...config.pagamentos.dsMercadoPago, ativo: e.target.checked } } })}
                    />
                  </div>

                  {config.pagamentos.dsMercadoPago.ativo && (
                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={styles.label}>Public Key</label>
                      <input style={styles.input} value={config.pagamentos.dsMercadoPago.publicKey || ""} onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsMercadoPago: { ...config.pagamentos.dsMercadoPago, publicKey: e.target.value } } })} />
                      <label style={styles.label}>Access Token</label>
                      <input style={styles.input} type="password" value={config.pagamentos.dsMercadoPago.accessToken || ""} onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsMercadoPago: { ...config.pagamentos.dsMercadoPago, accessToken: e.target.value } } })} />
                    </div>
                  )}
                </div>
              )}

              {/* PAGSEGURO - Só aparece se estiver liberado no plano */}
              {masterLiberouMeioPagamento("pagseguro") && (
                <div style={{
                  background: config.pagamentos.dsPagSeguro.ativo ? '#fdf8f5' : '#f8fafc',
                  padding: '20px',
                  borderRadius: '15px',
                  border: config.pagamentos.dsPagSeguro.ativo ? '1px solid #ff6c00' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ color: '#ff6c00', fontSize: '13px' }}>PAGSEGURO Checkout Transparente</b>
                    <input
                      type="checkbox"
                      checked={!!config.pagamentos.dsPagSeguro.ativo}
                      onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsPagSeguro: { ...config.pagamentos.dsPagSeguro, ativo: e.target.checked } } })}
                    />
                  </div>

                  {config.pagamentos.dsPagSeguro.ativo && (
                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={styles.label}>E-mail da Conta PagSeguro</label>
                      <input style={styles.input} placeholder="exemplo@loja.com.br" value={config.pagamentos.dsPagSeguro.email || ""} onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsPagSeguro: { ...config.pagamentos.dsPagSeguro, email: e.target.value } } })} />
                      <label style={styles.label}>Token de Production PagSeguro</label>
                      <input style={styles.input} type="password" placeholder="Cole o token de contingência" value={config.pagamentos.dsPagSeguro.token || ""} onChange={e => setConfig({ ...config, pagamentos: { ...config.pagamentos, dsPagSeguro: { ...config.pagamentos.dsPagSeguro, token: e.target.value } } })} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {abaAtiva === 'aparencia' && (
          <section>
            <h3 style={styles.h3}>Personalização Visual do Catálogo</h3>
            {!masterLiberou("temPersonalizacao") ? (
              <div style={styles.lockNotice}>🔒 Bloqueado no plano {config.plano}.</div>
            ) : (
              <>
                <p style={styles.helpText}>Ajuste as cores principais do seu site para combinar com sua marca.</p>
                <div style={styles.colorGrid}>
                  <div style={styles.colorItem}>
                    <label style={styles.label}>Cor Principal</label>
                    <input type="color" style={styles.inputColor} value={config.aparencia.dscorPrincipal} onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorPrincipal: e.target.value } })} />
                  </div>
                  <div style={styles.colorItem}>
                    <label style={styles.label}>Cor Secundária</label>
                    <input type="color" style={styles.inputColor} value={config.aparencia.dscorSecundaria} onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorSecundaria: e.target.value } })} />
                  </div>
                  <div style={styles.colorItem}>
                    <label style={styles.label}>Cor de Fundo</label>
                    <input type="color" style={styles.inputColor} value={config.aparencia.dscorFundo} onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorFundo: e.target.value } })} />
                  </div>
                  <div style={styles.colorItem}>
                    <label style={styles.label}>Cor dos Textos</label>
                    <input type="color" style={styles.inputColor} value={config.aparencia.dscorTextoCard} onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorTextoCard: e.target.value } })} />
                  </div>
                </div>
                <button
                  style={{ ...styles.btnHorario, marginTop: '20px', background: '#f1f5f9', border: '1px dashed #cbd5e1' }}
                  onClick={() => setConfig({ ...config, aparencia: { dscorPrincipal: "#FFCC80", dscorSecundaria: "#f1e5d7", dscorFundo: "#FFF9F2", dscorTextoCard: "#8B5E3C" } })}
                >
                  🔄 Restaurar Cores Padrão
                </button>
              </>
            )}
          </section>

        )}

        {abaAtiva === 'sistema' && (
          <section>
            <h3 style={styles.h3}>Marketing</h3>
            <button disabled={!masterLiberou("temCupons")} onClick={() => setShowCupomModal(true)} style={masterLiberou("temCupons") ? styles.btnCupom : styles.btnDisabled}>
              {masterLiberou("temCupons") ? "🎟️ Gerenciar Cupons de Desconto" : "🔒 Cupons Bloqueados"}
            </button>

            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Configuração de Frete Grátis</h3>
            <div style={{ background: !masterLiberou("temFreteGratis") ? '#fafafa' : config.sistema.isFreteGratisAtivo ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Ativar Frete Grátis</span>
                <input
                  type="checkbox"
                  disabled={!masterLiberou("temFreteGratis")}
                  checked={!!config.sistema.isFreteGratisAtivo}
                  onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteGratisAtivo: e.target.checked } })}
                />
              </div>
              {config.sistema.isFreteGratisAtivo && (
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.label}>Valor Mínimo (R$)</label>
                  <input
                    style={styles.input}
                    value={config.sistema.vlFreteGratisMinimo}
                    onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteGratisMinimo: aplicarMascara(e.target.value, 'dinheiro') } })}
                  />
                </div>
              )}
            </div>

            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Logística e Entrega</h3>
            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Logística e Entrega</h3>
            <div style={{ opacity: masterLiberou("temLogistica") ? 1 : 0.6 }}>
              <label style={styles.label}>Token Melhor Envio</label>
              <input
                style={styles.input}
                type={showToken ? "text" : "password"}
                disabled={!masterLiberou("temLogistica")}
                value={config.sistema.dsTokenMelhorEnvio}
                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvio: e.target.value } })}
                placeholder={masterLiberou("temLogistica") ? "Cole seu token aqui..." : "Bloqueado"}
              />

              <label style={{ ...styles.label, marginTop: '15px' }}>Transportadoras Ativas</label>
              <div style={styles.gridTransp}>
                {["azul", "correios", "jadlog", "latam"].map(t => (
                  <label
                    key={t}
                    style={{ ...styles.transpItem, cursor: masterLiberou("temLogistica") ? 'pointer' : 'not-allowed' }}
                  >
                    <input
                      type="checkbox"
                      disabled={!masterLiberou("temLogistica")}
                      // Usamos ?. para evitar o erro e !! para garantir valor booleano
                      checked={masterLiberou("temLogistica") ? !!(config.sistema.dstransportadoras?.[t]) : false}
                      onChange={() => {
                        // Garantimos um objeto padrão {} caso dstransportadoras esteja undefined
                        const transportadorasAtuais = config.sistema.dstransportadoras || {};
                        const novas = {
                          ...transportadorasAtuais,
                          [t]: !transportadorasAtuais[t]
                        };

                        setConfig({
                          ...config,
                          sistema: {
                            ...config.sistema,
                            dstransportadoras: novas
                          }
                        });
                      }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{t}</span>
                  </label>
                ))}
              </div>

              {!masterLiberou("temLogistica") && (
                <div style={styles.lockNotice}>
                  🔒 Logística e Integrações indisponíveis no seu plano atual.
                </div>
              )}
            </div>

            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Status da Loja</h3>
            <select
              style={styles.input}
              value={String(config.sistema.isLojaAberta)}
              onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isLojaAberta: e.target.value === "true" } })}
            >
              <option value="true">🟢 ABERTA PARA PEDIDOS</option>
              <option value="false">🔴 VITRINE (CATÁLOGO)</option>
            </select>
          </section>

        )}

        {/* --- SEÇÃO DE MENSAGENS --- */}
        {abaAtiva === 'mensagens' && (
          <section style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ ...styles.h3, margin: 0 }}>Histórico de Mensagens</h3>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {config.historicoMensagens?.filter((m: any) => !m.lida).length || 0} não lidas
              </div>
            </div>

            <div style={styles.msgContainer}>
              {config.historicoMensagens?.length > 0 ? (
                config.historicoMensagens.map((msg: any) => (
                  <div key={msg.id} style={{
                    ...styles.msgItem,
                    borderLeft: msg.prioridade === 'alta' ? '4px solid #ef4444' : '4px solid #3b82f6',
                    opacity: msg.lida ? 0.6 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}>{msg.titulo || 'Comunicado'}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {msg.dataEnvio?.seconds ? new Date(msg.dataEnvio.seconds * 1000).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{msg.texto}</p>

                    {!msg.lida && (
                      <button
                        onClick={() => confirmarLeituraMensagem(msg.id)}
                        style={{ marginTop: '10px', fontSize: '10px', background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        MARCAR COMO LIDA
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div style={styles.noMsg}>Nenhuma mensagem registrada.</div>
              )}
            </div>
          </section>
        )}

        {/* --- BOTÃO SALVAR (NÃO APARECE NA ABA DE MENSAGENS) --- */}
        {abaAtiva !== 'mensagens' && abaAtiva !== 'assinatura' && (
          <button onClick={handleSalvar} disabled={salvando} style={salvando ? styles.btnDisabled : styles.btnSalvar}>
            {salvando ? "Processando..." : "💾 Salvar Alterações"}
          </button>
        )}

        {abaAtiva === 'assinatura' && (
          <section style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ ...styles.h3, margin: '0 0 10px 0' }}>Gerenciamento de Assinatura</h3>

            {/* Cabeçalho do Plano */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Plano Atual</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>
                    {config.dadosLoja?.dsPlanoLoja || 'Bronze'}
                  </div>

                  <div style={{ fontSize: '13px', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                    R$ {planosConfig?.[config.dadosLoja?.dsPlanoLoja || 'Bronze']?.preco || '0'},00 / mês
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px', lineHeight: '1.6' }}>
                    ✅ {planosConfig?.[config.dadosLoja?.dsPlanoLoja || 'Bronze']?.produtos || 0} produtos permitidos
                    <br />
                    ✅ {planosConfig?.[config.dadosLoja?.dsPlanoLoja || 'Bronze']?.categorias || 0} categorias
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Vencimento</div>
                  <div style={{ fontWeight: '600', color: '#ef4444' }}>
                    {config.dadosLoja?.tsVencimentoLoja ? new Date(config.dadosLoja.tsVencimentoLoja.seconds * 1000).toLocaleDateString('pt-BR') : '---'}
                  </div>
                </div>
              </div>
              {/* Histórico de Pagamentos */}
              <div style={styles.msgContainer}>
                {config.historicoPagamentos?.length > 0 ? (
                  config.historicoPagamentos.map((pag: any) => (
                    <div key={pag.id} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '15px',
                      borderBottom: '1px solid #f1f5f9', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '700' }}>{pag.dsMesReferencia}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {pag.tsAssinaturaLojista?.seconds ? new Date(pag.tsAssinaturaLojista.seconds * 1000).toLocaleDateString('pt-BR') : '---'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>R$ {pag.vlAssinaturaLojista?.toFixed(2)}</div>
                        <span style={{
                          fontSize: '10px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '10px',
                          background: pag.dsStatusPagamentoLojista === 'Ativação' ? '#dcfce7' : '#fee2e2',
                          color: pag.dsStatusPagamentoLojista === 'Ativação' ? '#166534' : '#991b1b'
                        }}>
                          {pag.dsStatusPagamentoLojista}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhum histórico encontrado.</div>
                )}
              </div>

            </div>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <select style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} onChange={(e) => {/* lógica de filtro */ }}>
                <option value="todos">Todos os Status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>

            {/* Lista de Pagamentos */}

            <div style={styles.msgContainer}>
              {config.historicoPagamentos?.length > 0 ? (
                config.historicoPagamentos.map((pag: any) => (
                  <div key={pag.id} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '15px',
                    borderBottom: '1px solid #f1f5f9', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '700' }}>{pag.dsMesReferencia}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {pag.tsAssinaturaLojista?.seconds ? new Date(pag.tsAssinaturaLojista.seconds * 1000).toLocaleDateString('pt-BR') : '---'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>R$ {pag.vlAssinaturaLojista?.toFixed(2)}</div>

                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhum histórico encontrado.</div>
              )}
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              style={{
                marginTop: '20px',
                width: '100%',
                background: '#2563eb',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              VER COMPARATIVO DE PLANOS E UPGRADE
            </button>
          </section>
        )}
        <CupomModal show={showCupomModal} onClose={() => setShowCupomModal(false)} cupons={config.sistema.cupons} setCupons={(n) => setConfig({ ...config, sistema: { ...config.sistema, cupons: n } })} />
        <HorarioModal show={showHorarioModal} onClose={() => setShowHorarioModal(false)} horarios={config.sistema.horarios} setHorarios={(n) => setConfig({ ...config, sistema: { ...config.sistema, horarios: n } })} />
        <UpgradeModal
          show={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          planos={planosConfig}
          planoAtual={config.dadosLoja.dsPlanoLoja}
          onSolicitar={solicitarUpgrade}
        />
      </div>
    </div>
  );
}

const styles: any = {
  page: { padding: "40px 20px", background: "#f8fafc", minHeight: "100vh", display: "flex", justifyContent: "center" },
  card: { background: "#fff", padding: "35px", borderRadius: "24px", width: "100%", maxWidth: "970px", boxShadow: "0 10px 15px rgba(0,0,0,0.05)" },
  seloCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: '#fff', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  medalhaBox: { width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  badgeTeste: { background: '#fff7ed', color: '#c2410c', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #ffedd5' },
  badgeAtivo: { background: '#f0fdf4', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #dcfce7' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '5px' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  infoLabel: { fontSize: '9px', fontWeight: '800', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' },
  infoValue: { fontSize: '12px', fontWeight: '700', color: '#1e293b' },
  tabBar: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', flexWrap: 'nowrap', overflowX: 'hidden' },
  tabBtn: { padding: '12px', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', color: '#94a3b8', fontWeight: 'bold', fontSize: '11px', transition: '0.2s', whiteSpace: 'nowrap' },
  tabBtnActive: { padding: '12px', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '3px solid #2563eb', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold', fontSize: '11px', transition: '0.2s', whiteSpace: 'nowrap' },
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  inputRow: { display: 'flex', gap: '15px' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none' },
  previewLogo: { width: '60px', height: '60px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
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
  popupCard: { background: '#fff', padding: '30px', borderRadius: '24px', maxWidth: '450px', width: '100%', textAlign: 'center' },
  popupHeader: { fontSize: '14px', fontWeight: '900', color: '#3b82f6', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  popupText: { fontSize: '16px', color: '#475569', marginBottom: '30px', lineHeight: '1.6', fontWeight: '500' },
  btnPopupConfirm: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  gridTransp: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' },
  transpItem: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' },
  lockNotice: { padding: '12px', background: '#fff1f2', color: '#be123c', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px' },
  lockNoticeGateway: { padding: '8px 12px', background: '#fff1f2', color: '#be123c', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px', display: 'inline-block' },
  helpText: { fontSize: '12px', color: '#64748b', marginBottom: '20px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #2563eb' },
  bannerGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  bannerField: { border: '1px solid #e2e8f0', padding: '15px', borderRadius: '12px', background: '#f8fafc' },
  bannerPreview: { width: '100%', height: '120px', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  uploadTrigger: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#475569' },
  btnAdicionarSocial: { background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnRemoveSocial: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  colorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', marginTop: '10px' },
  colorItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  inputColor: { width: '100%', height: '40px', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', padding: '2px', background: '#fff' }
};