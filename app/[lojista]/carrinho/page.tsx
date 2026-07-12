"use client";

import { Produto } from '@/types';
import { useCart } from "@/app/context/CartContext";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { ChevronLeft, Trash2, Plus, Minus, X, Gift, Mail } from "lucide-react";
import CamposPersonalizacao from "../_components/CamposPersonalizacao";
import { executarFluxoPedido } from "../_components/helperPedido";

interface DadosLoja {
  nomeLoja: string;
  logoUrl?: string;
  whatsapp?: string;
  freteGratisAtivo?: boolean;
  valorMinimoFreteGratis?: string;
  transportadoras?: any;
  cidade?: string;
  tema?: any;
  lojaAberta?: boolean;
  chavePix?: string;
  pix?: string;
  cupons?: any;
  plano?: string;
  mercadoPago?: { ativo?: boolean; sandbox?: boolean };
  pagseguro?: { ativo?: boolean; sandbox?: boolean };
  cep?: string;
  CEP?: string;
}

export default function CarrinhoIdentidadeVisual() {
  const { cart, setItemQty, removeFromCart, clearCart } = useCart() as {
    cart: Produto[];
    setItemQty: (key: string, qty: number) => void;
    removeFromCart: (key: string) => void;
    clearCart: () => void;
  };
  const router = useRouter();
  const params = useParams();

  const lojistaSlug = (params?.lojista as string) || (params?.slug as string) || "";

  const isItemDigital = useCallback((item: any) =>
    item.precisaFrete === false &&
    item.envioTransportadora === false &&
    item.permiteRetirada === false, []);

  const [dadosLoja, setDadosLoja] = useState<DadosLoja | null>(null);
  const [lojistaId, setLojistaId] = useState<string | null>(null);
  const [cupomDigitado, setCupomDigitado] = useState("");
  const [descontoAtivo, setDescontoAtivo] = useState({ valor: 0, tipo: "" });
  const [requisitosDoBanco, setRequisitosDoBanco] = useState<Record<string, any>>({});

  const safeCart: Produto[] = useMemo(() => Array.isArray(cart) ? cart : [], [cart]);
  const temFrete = useMemo(() => safeCart.some(item => !isItemDigital(item)), [safeCart, isItemDigital]);

  const [cliente, setCliente] = useState({ nome: "", cpf: "", cep: "", dsTelefone: "" });
  const [endereco, setEndereco] = useState({ rua: "", numero: "", bairro: "", cidade: "", uf: "", complemento: "" });
  const [personalizacoes, setPersonalizacoes] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (typeof window !== "undefined" && lojistaSlug) {
      const c = localStorage.getItem(`cliente_${lojistaSlug}`);
      const e = localStorage.getItem(`end_${lojistaSlug}`);
      const p = localStorage.getItem(`pers_${lojistaSlug}`);

      if (c) {
        try {
          const parsed = JSON.parse(c);
          setCliente({
            nome: parsed.nome || "",
            cpf: parsed.cpf || "",
            cep: parsed.cep || "",
            dsTelefone: parsed.dsTelefone || ""
          });
        } catch (err) {
          console.error("Erro ao parsear cliente", err);
        }
      }

      if (e) {
        try {
          const parsed = JSON.parse(e);
          setEndereco({
            rua: parsed.rua || "",
            numero: parsed.numero || "",
            bairro: parsed.bairro || "",
            cidade: parsed.cidade || "",
            uf: parsed.uf || "",
            complemento: parsed.complemento || ""
          });
        } catch (err) {
          console.error("Erro ao parsear endereço", err);
        }
      }

      if (p) {
        try {
          setPersonalizacoes(JSON.parse(p));
        } catch (err) {
          console.error("Erro ao parsear personalizacoes", err);
        }
      }
    }
  }, [lojistaSlug]);

  const [opcoesFrete, setOpcoesFrete] = useState<any[]>([]);
  const [freteSel, setFreteSel] = useState<any>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [listaFreteCache, setListaFreteCache] = useState<any[]>([]);
  const [freteBackup, setFreteBackup] = useState<any>(null);

  const config = useMemo(() => ({
    corDestaque: dadosLoja?.tema?.corPrincipal || "#FFCC80",
    corSecundaria: dadosLoja?.tema?.corSecundaria || "#fdf5eb",
    corFundoSite: dadosLoja?.tema?.corFundo || "#FFF9F2",
    corTexto: dadosLoja?.tema?.corTextoCard || "#8B5E3C",
    whatsapp: dadosLoja?.whatsapp || ""
  }), [dadosLoja]);

  const validarCPFReal = (cpf: string): boolean => {
    const limpo = cpf.replace(/\D/g, "");
    if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) return false;
    let soma = 0; let resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(10, 11))) return false;
    return true;
  };

  const cpfValido = useMemo(() => {
    if (!cliente.cpf) return true;
    const limpo = cliente.cpf.replace(/\D/g, "");
    if (limpo.length < 11) return true;
    return validarCPFReal(cliente.cpf);
  }, [cliente.cpf]);

  const aplicarMascaraCPF = (valor: string) => {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length > 11) return valor.substring(0, 14);
    return limpo.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").substring(0, 14);
  };

  const aplicarMascaraCEP = (valor: string) => {
    const limpo = valor.replace(/\D/g, "");
    return limpo.replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9);
  };

  const valorSubtotalProdutos = useMemo(() => {
    return safeCart.reduce((acc, item) => acc + (Number(item.preco || item.price || 0) * Number(item.qty || 1)), 0);
  }, [safeCart]);

  const freteGratisConfig = useMemo(() => {
    if (!dadosLoja?.freteGratisAtivo) return { ativo: false, atingido: false, minimo: 0, falta: 0 };
    const valorLimpo = String(dadosLoja.valorMinimoFreteGratis || "0").replace(/\./g, "").replace(",", ".");
    const valorMinimo = parseFloat(valorLimpo) || 0;
    const atingido = valorSubtotalProdutos >= valorMinimo;
    const falta = Math.max(0, valorMinimo - valorSubtotalProdutos);
    return { ativo: true, atingido, minimo: valorMinimo, falta };
  }, [dadosLoja, valorSubtotalProdutos]);

  useEffect(() => {
    // 1. Se o carrinho não exige frete, limpa e sai
    if (!temFrete) {
      setOpcoesFrete([]);
      return;
    }

    // 2. Se a lista de fretes da API chegou
    // 2. Se a lista de fretes da API chegou
    if (listaFreteCache.length > 0) {
      const freteGratisAtivo = !!dadosLoja?.freteGratisAtivo;
      const atingiuGratis = freteGratisConfig.atingido;

      // Sempre filtra as transportadoras permitidas pelo lojista
      const transportadorasAtivas = dadosLoja?.transportadoras || {};
      const listaFiltrada = listaFreteCache.filter((f: any) => {
        const idLower = String(f.id).toLowerCase();
        if (idLower.includes("correios") || idLower.includes("pac") || idLower.includes("sedex")) return !!transportadorasAtivas.correios;
        if (idLower.includes("azul")) return !!transportadorasAtivas.azul;
        if (idLower.includes("jadlog")) return !!transportadorasAtivas.jadlog;
        if (idLower.includes("latam")) return !!transportadorasAtivas.latam;
        return true;
      });

      let listaFinal = [];

      if (freteGratisAtivo && atingiuGratis) {
        // REGRA: Atingiu o Frete Grátis -> Exibe APENAS a opção gratuita
        const opcaoGratuita = { id: "frete_gratis_ativado", name: "Frete Grátis Promocional", price: 0 };
        listaFinal = [opcaoGratuita];

        // Auto-seleciona o Frete Grátis
        setFreteSel(opcaoGratuita);
      } else {
        // REGRA: Não atingiu -> Exibe as opções pagas filtradas
        listaFinal = listaFiltrada;

        // Se não houver seleção ou a anterior era o grátis, seleciona a primeira da lista
        if (!freteSel || freteSel.id === "frete_gratis_ativado") {
          setFreteSel(listaFinal.length > 0 ? listaFinal[0] : null);
        }
      }

      setOpcoesFrete(listaFinal);
    }
  }, [
    listaFreteCache.length,
    freteGratisConfig.atingido,
    !!dadosLoja?.freteGratisAtivo,
    temFrete,
    freteSel?.id,
    // Em vez de passar o objeto inteiro, passamos o tamanho das chaves ou um valor simples
    JSON.stringify(dadosLoja?.transportadoras || {})
  ]);
  const valorDesconto = useMemo(() => {
    if (descontoAtivo.tipo === "fixo") return descontoAtivo.valor;
    if (descontoAtivo.tipo === "porcentagem") return valorSubtotalProdutos * (descontoAtivo.valor / 100);
    return 0;
  }, [valorSubtotalProdutos, descontoAtivo]);

  const valorSubTotalComDesconto = useMemo(() => Math.max(0, valorSubtotalProdutos - valorDesconto), [valorSubtotalProdutos, valorDesconto]);
  const totalGeral = useMemo(() => {
    if (!temFrete) return valorSubTotalComDesconto;

    // Se atingiu o frete grátis, o valor é 0, senão usa o preço selecionado
    const valorDoFrete = (freteGratisConfig.atingido) ? 0 : Number(freteSel?.price || 0);

    return valorDoFrete + valorSubTotalComDesconto;
  }, [
    valorSubTotalComDesconto,
    freteSel?.price, // <--- AQUI ESTÁ O SEGREDO: dependa do preço, não do objeto inteiro
    temFrete,
    freteGratisConfig.atingido
  ]);
  const verificarRequisitosValidos = (requisitosAtivos: any) => {
    if (!requisitosAtivos) return false;
    if (Array.isArray(requisitosAtivos)) return requisitosAtivos.some((r: any) => r && (r.label || r.id));
    if (typeof requisitosAtivos === "object") {
      return (requisitosAtivos.pedeNome || requisitosAtivos.pedeIdade || requisitosAtivos.pedeData || requisitosAtivos.pedeObs);
    }
    return false;
  };

  const lojistaAtivouEPlanoLiberou = useCallback((gateway: "mercado_pago" | "pagseguro") => {
    if (!dadosLoja) return false;
    const ativoNoLojista = gateway === "mercado_pago" ? !!dadosLoja.mercadoPago?.ativo : !!dadosLoja.pagseguro?.ativo;
    if (!ativoNoLojista) return false;
    const sandboxAtivo = dadosLoja?.pagseguro?.sandbox === true || dadosLoja?.mercadoPago?.sandbox === true;
    if (sandboxAtivo) return true;
    const plano = dadosLoja.plano || "Bronze";
    if (gateway === "mercado_pago") return plano === "Prata" || plano === "Ouro";
    if (gateway === "pagseguro") return plano === "Ouro";
    return false;
  }, [dadosLoja]);

  const temCheckoutOnlineAtivo = useCallback(() => lojistaAtivouEPlanoLiberou("mercado_pago") || lojistaAtivouEPlanoLiberou("pagseguro"), [lojistaAtivouEPlanoLiberou]);

  const podeFinalizar = useMemo(() => {
    if (dadosLoja && dadosLoja.lojaAberta === false) return false;

    const validacaoEntrega = temFrete
      ? (cliente.cep.replace(/\D/g, "").length === 8 && endereco.numero.trim().length > 0 && freteSel !== null)
      : true;

    // Validação atualizada usando dsTelefone
    const baseValid =
      cliente.nome.trim().length > 3 &&
      validarCPFReal(cliente.cpf) &&
      cliente.dsTelefone.replace(/\D/g, "").length >= 10 &&
      validacaoEntrega &&
      safeCart.length > 0;

    if (!baseValid) return false;

    for (let i = 0; i < safeCart.length; i++) {
      const item = safeCart[i];
      const key = item.cartItemKey || `item_${i}`;
      const requisitosAtivos = item.requisitos || requisitosDoBanco[item.id];
      if (requisitosAtivos) {
        const respostasItem = personalizacoes[key] || {};
        if (Array.isArray(requisitosAtivos)) {
          for (const req of requisitosAtivos) {
            if (req?.obrigatorio && (!respostasItem[String(req.id)] || !respostasItem[String(req.id)].trim())) return false;
          }
        } else if (typeof requisitosAtivos === "object") {
          if (requisitosAtivos.pedeNome && (!respostasItem.nome || !respostasItem.nome.trim())) return false;
          if (requisitosAtivos.pedeIdade && (!respostasItem.idade || !respostasItem.idade.trim())) return false;
          if (requisitosAtivos.pedeData && (!respostasItem.data || !respostasItem.data.trim())) return false;
        }
      }
    }
    return true;
  }, [cliente, endereco, freteSel, safeCart, personalizacoes, requisitosDoBanco, dadosLoja, temFrete]);
  useEffect(() => {
    async function carregarDono() {
      if (!lojistaSlug) return;
      try {
        const q = query(collection(db, "lojistas"), where("slug", "==", lojistaSlug), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setLojistaId(querySnapshot.docs[0].id);
          setDadosLoja(querySnapshot.docs[0].data() as DadosLoja);
        }
      } catch (err) { console.error("Erro ao carregar dados da loja:", err); }
    }
    carregarDono();
  }, [lojistaSlug]);

  useEffect(() => {
    if (!lojistaId || safeCart.length === 0) return;
    async function sincronizarRequisitos() {
      try {
        const novosRequisitos: Record<string, any> = {};
        for (const item of safeCart) {
          if (item.id && !novosRequisitos[item.id]) {
            const produtoRef = doc(db, "lojistas", lojistaId!, "produtos", item.id);
            const snap = await getDoc(produtoRef);
            if (snap.exists() && snap.data().requisitos) {
              novosRequisitos[item.id] = snap.data().requisitos;
            }
          }
        }
        setRequisitosDoBanco(prev => ({ ...prev, ...novosRequisitos }));
      } catch (err) { console.error("Erro ao sincronizar requisitos:", err); }
    }
    sincronizarRequisitos();
  }, [safeCart, lojistaId]);

  const aplicarCupom = () => {
    if (!dadosLoja?.cupons) return alert("Esta loja não possui cupons cadastrados.");
    const cupomEncontrado = dadosLoja.cupons[cupomDigitado.toUpperCase().trim()];
    if (cupomEncontrado && cupomEncontrado.ativo) {
      setDescontoAtivo({ valor: Number(cupomEncontrado.valor), tipo: cupomEncontrado.tipo });
      alert("Cupom aplicado com sucesso!");
    } else { alert("Cupom inválido ou expirado."); }
  };

  const limparTudo = () => {
    clearCart();
    localStorage.removeItem(`cliente_${lojistaSlug}`);
    localStorage.removeItem(`end_${lojistaSlug}`);
    localStorage.removeItem(`pers_${lojistaSlug}`);
    setCliente({ nome: "", cpf: "", cep: "", dsTelefone: "" });
    setEndereco({ rua: "", numero: "", bairro: "", cidade: "", uf: "", complemento: "" });
    setPersonalizacoes({});
    setFreteSel(null);
    setOpcoesFrete([]);
    router.push("/" + lojistaSlug);
  };

  const limparCupom = () => { setCupomDigitado(""); setDescontoAtivo({ valor: 0, tipo: "" }); };

  useEffect(() => {
    const cepClienteLimpo = cliente.cep.replace(/\D/g, "");

    // 1. Validação inicial e reset
    if (safeCart.length === 0 || !temFrete || cepClienteLimpo.length !== 8 || !lojistaId) {
      setOpcoesFrete([]);
      setFreteSel(null);
      setLoadingFrete(false);
      return;
    }

    setLoadingFrete(true);

    async function calcularTudo() {
      try {
        // Busca dados do CEP
        const rVia = await fetch(`https://viacep.com.br/ws/${cepClienteLimpo}/json/`);
        const dadosCliente = await rVia.json();
        if (dadosCliente.erro) { throw new Error("CEP inválido"); }

        // Atualiza endereço base
        setEndereco(prev => ({
          ...prev,
          rua: dadosCliente.logradouro || "",
          bairro: dadosCliente.bairro || "",
          cidade: dadosCliente.localidade || "",
          uf: dadosCliente.uf || ""
        }));

        // Calcula frete na API
        const rFrete = await fetch(`${window.location.origin}/api/frete/calcular`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cepDestino: cepClienteLimpo, lojistaId, itensFiltrados: safeCart,
            pacote: { peso: 0.5, altura: 10, largura: 20, comprimento: 20 }
          })
        });

        const listaBruta = await rFrete.json();
        let listaCalculada = Array.isArray(listaBruta) ? listaBruta.filter((f: any) => !f.error) : [];

        // Lógica de Retirada na loja
        const cidCli = dadosCliente.localidade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cidLoj = dadosLoja?.cidade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (cidCli && cidLoj && cidCli === cidLoj) {
          listaCalculada.unshift({ id: "retirar_loja", name: "Retirar na Loja", price: 0 });
        }

        // Filtragem de transportadoras
        // ... (código anterior: busca cep, API de frete, retirada na loja)

        // Filtragem de transportadoras
        const permitidas = dadosLoja?.transportadoras || {};
        let listaFiltrada = listaCalculada.filter((f: any) => {
          const idLower = String(f.id).toLowerCase();
          if (idLower.includes("correios") || idLower.includes("pac") || idLower.includes("sedex")) return !!permitidas.correios;
          if (idLower.includes("azul")) return !!permitidas.azul;
          if (idLower.includes("jadlog")) return !!permitidas.jadlog;
          if (idLower.includes("latam")) return !!permitidas.latam;
          return true;
        });

        // --- MUDANÇA AQUI: LÓGICA DE EXCLUSIVIDADE ---
        let listaFinal = [];

        if (freteGratisConfig.atingido) {
          // SE ATINGIU: Exclui TUDO e mostra APENAS o Frete Grátis
          const opcaoGratuita = { id: "frete_gratis_ativado", name: "Frete Grátis Promocional", price: 0 };
          listaFinal = [opcaoGratuita];
          setFreteSel(opcaoGratuita);
        } else {
          // SE NÃO ATINGIU: Mostra as pagas permitidas
          listaFinal = listaFiltrada;

          if (listaFinal.length > 0) {
            // PROCURA O FRETE JÁ SELECIONADO NA NOVA LISTA PARA PEGAR O PREÇO ATUALIZADO
            const freteAtualizado = listaFinal.find(f => f.id === freteSel?.id);

            if (freteAtualizado) {
              // Atualiza com o preço novo que a API acabou de calcular
              setFreteSel(freteAtualizado);
            } else {
              // Se o frete antigo não existe mais na lista, seleciona o primeiro
              setFreteSel(listaFinal[0]);
            }
          } else {
            setFreteSel(null);
          }
        }

        setOpcoesFrete(listaFinal);
        setLoadingFrete(false);


      } catch (err) {
        console.error("Erro na cotação:", err);
        setLoadingFrete(false);
      }
    }

    calcularTudo();
  }, [
    cliente.cep || "",
    lojistaId || "",
    !!temFrete,
    safeCart.map(i => `${i.id}-${i.qty}`).join('|'),
    dadosLoja?.cep || "",
    dadosLoja?.CEP || "",
    JSON.stringify(dadosLoja?.transportadoras || {}),
    dadosLoja?.cidade || "",
    // Use um valor primitivo calculado aqui, em vez do objeto inteiro:
    valorSubtotalProdutos >= (parseFloat(String(dadosLoja?.valorMinimoFreteGratis || "0").replace(/\./g, "").replace(",", ".")) || 0)
  ]);

  useEffect(() => {
    if (temCheckoutOnlineAtivo()) { setQrCodeUrl(""); return; }
    const fontPix = dadosLoja?.chavePix || dadosLoja?.pix || "";
    if (!fontPix || totalGeral <= 0) { setQrCodeUrl(""); return; }
    const v = totalGeral.toFixed(2);
    const f = (id: string, val: string) => id + String(val.length).padStart(2, "0") + val;
    let payload = f("00", "01") + f("26", f("00", "br.gov.bcb.pix") + f("01", fontPix.trim())) + f("52", "0000") + f("53", "986") + f("54", v) + f("58", "BR") + f("59", "LOJA") + f("60", "CIDADE") + f("62", f("05", "***")) + "6304";
    const crc16 = (s: string) => {
      let c = 0xFFFF;
      for (let i = 0; i < s.length; i++) {
        c ^= s.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) { if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; else c << 1; }
      }
      return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    };
    setQrCodeUrl("https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(payload + crc16(payload)));
  }, [dadosLoja, totalGeral, temCheckoutOnlineAtivo]);

  const finalizarNoWhatsApp = async () => {
    if (!podeFinalizar || !config.whatsapp || !lojistaId) return;
    const formaEnvio = !temFrete ? 'digital' : (freteSel?.id === 'retirar_loja' ? 'retirada' : 'transportadora');
    const logistica = { formaEnvio, servico: freteSel?.name || "N/A", valorFrete: freteSel?.price || 0, transportadoraId: formaEnvio === 'transportadora' ? (freteSel?.id || "padrao") : null };
    const itensProcessados = safeCart.map(item => ({ ...item, precisaFrete: !!item.precisaFrete, envioTransportadora: !!item.envioTransportadora, permiteRetirada: !!item.permiteRetirada, foto: item.foto || item.imagem || item.url || "", sku: item.sku || "SEM-SKU" }));
    await executarFluxoPedido({ lojistaId, lojistaSlug, cliente, endereco, personalizacoes, requisitosDoBanco, valorSubtotalProdutos, valorDesconto, totalGeral, safeCart: itensProcessados, freteSel: temFrete ? freteSel : { id: "sem_frete", name: "Entrega Digital", price: 0 }, freteBackup, freteGratisConfig, whatsappNumero: config.whatsapp.replace(/\D/g, ""), dadosLoja: dadosLoja, logistica: logistica });
  };

  const atualizarSubCampoPersonalizacao = (key: string, campoId: string, valorBruto: string) => {
    let valorFinal = valorBruto;
    const itemNoCarrinho = safeCart.find((i: any) => i.cartItemKey === key || `item_${safeCart.indexOf(i)}` === key);
    const requisitosAtivos = itemNoCarrinho?.requisitos || requisitosDoBanco[itemNoCarrinho?.id || ""];
    const campoAlvo = Array.isArray(requisitosAtivos) ? requisitosAtivos.find((r: any) => String(r.id) === String(campoId)) : null;
    if (campoAlvo && campoAlvo.tipo === "time") {
      let limpo = valorBruto.replace(/\D/g, "");
      if (limpo.length > 4) limpo = limpo.substring(0, 4);
      if (limpo.length >= 2) {
        let horas = parseInt(limpo.substring(0, 2), 10);
        if (horas > 23) horas = 23;
        limpo = String(horas).padStart(2, "0") + limpo.substring(2);
      }
      if (limpo.length === 4) {
        let minutes = parseInt(limpo.substring(2, 4), 10);
        if (minutes > 59) minutes = 59;
        limpo = limpo.substring(0, 2) + String(minutes).padStart(2, "0");
      }
      valorFinal = limpo.length > 2 ? limpo.substring(0, 2) + ":" + limpo.substring(2) : limpo;
    }
    setPersonalizacoes(prev => ({ ...prev, [key]: { ...prev[key], [String(campoId)]: valorFinal } }));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: config.corFundoSite, fontFamily: 'sans-serif', overflowX: 'hidden' }}>
      <header style={headerStyles.headerContainer}>
        <div style={{ backgroundColor: config.corDestaque, height: '60px', width: '100%' }}></div>
        <div style={{ backgroundColor: config.corSecundaria, height: '55px', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}></div>
        <div style={headerStyles.headerContent}>
          <div style={headerStyles.leftGroup}>
            <button onClick={() => router.back()} style={headerStyles.btnBack}><ChevronLeft size={32} color="white" strokeWidth={3} /></button>
            <div style={headerStyles.logoBox} onClick={() => router.push("/" + lojistaSlug)}>
              <div style={headerStyles.logoWrapper}>{dadosLoja?.logoUrl && <img src={dadosLoja.logoUrl} style={styles.logoImg} alt="Logo" />}</div>
              <span style={headerStyles.nomeLojaText}>{(dadosLoja?.nomeLoja || lojistaSlug || "").toUpperCase()}</span>
            </div>
          </div>
        </div>
      </header>
      <main style={{ padding: '0 10px 100px', marginTop: '140px', boxSizing: 'border-box' }}>
        {dadosLoja?.freteGratisAtivo && safeCart.length > 0 && temFrete && (
          <div style={{ maxWidth: '1100px', margin: '0 auto 20px', padding: '15px', borderRadius: '15px', backgroundColor: freteGratisConfig.atingido ? '#e6f4ea' : '#fff8e1', border: `1px solid ${freteGratisConfig.atingido ? '#34a853' : '#fbbc05'}`, display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', boxSizing: 'border-box' }}>
            <Gift size={22} color={freteGratisConfig.atingido ? '#34a853' : '#fbbc05'} />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: freteGratisConfig.atingido ? '#137333' : '#b06000', textAlign: 'center' }}>
              {freteGratisConfig.atingido ? "🎉 Parabéns! Você atingiu o valor mínimo e ganhou FRETE GRÁTIS!" : `🛒 Faltam apenas R$ ${freteGratisConfig.falta.toFixed(2).replace('.', ',')} para você ganhar Frete Grátis!`}
            </span>
          </div>
        )}
        <h2 style={{ color: config.corTexto, textAlign: 'center', marginBottom: 20, fontSize: '1.4rem' }}>MEU CARRINHO</h2>
        <div style={styles.grid}>
          <div style={styles.mainColumn}>
            <div style={styles.card}>
              <h4 style={{ color: config.corTexto, margin: '0 0 15px 0' }}>ITENS NO CARRINHO</h4>
              {safeCart.length > 0 ? (
                safeCart.map((item: Produto, index: number) => {
                  const key = item.cartItemKey || `item_${index}`;
                  const partes = item.variacao ? item.variacao.split("/") : [];
                  const requisitosAtivos = item.requisitos || requisitosDoBanco[item.id];
                  const possuiRequisitosValidos = verificarRequisitosValidos(requisitosAtivos);
                  const isDigital = isItemDigital(item);
                  return (
                    <div key={key} style={styles.itemRow}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', marginRight: '12px', flexShrink: 0, backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        {(item.foto || item.imagem || item.url) ? <img src={item.foto || item.imagem || item.url} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <b style={{ color: config.corTexto, fontSize: '14px', wordBreak: 'break-word' }}>{item.nome || item.title}</b>
                          {isDigital && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>Digital</span>}
                        </div>
                        <span style={{ color: config.corTexto, fontSize: '14px' }}>R$ {Number(item.preco || item.price || 0).toFixed(2).replace('.', ',')}</span>
                        {item.variacao && item.variacao !== "Padrão" && (
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {item.nomeVar1 && partes && partes[0] && <p style={styles.varText}><b>{item.nomeVar1}:</b> {partes[0].trim()}</p>}
                            {item.nomeVar2 && partes && partes[1] && <p style={styles.varText}><b>{item.nomeVar2}:</b> {partes[1].trim()}</p>}
                          </div>
                        )}
                        {possuiRequisitosValidos && <CamposPersonalizacao itemKey={key} requisitosAtivos={requisitosAtivos} personalizacoes={personalizacoes} corTexto={config.corTexto} onUpdateField={atualizarSubCampoPersonalizacao} />}
                      </div>
                      <div style={styles.controls}>
                        <button onClick={() => setItemQty(key, Math.max(1, Number(item.qty || 1) - 1))} style={styles.qtyBtn}><Minus size={14} /></button>
                        <span style={{ fontWeight: 'bold', minWidth: 20, textAlign: 'center' }}>{item.qty || 1}</span>
                        <button onClick={() => setItemQty(key, Number(item.qty || 1) + 1)} style={styles.qtyBtn}><Plus size={14} /></button>
                        <button onClick={() => removeFromCart(key)} style={styles.btnDel}><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
                })
              ) : (<p style={{ textAlign: 'center', color: '#aaa', padding: '20px 0' }}>Seu carrinho está vazio.</p>)}
            </div>
            <div style={styles.card}>
              <h4 style={{ color: config.corTexto, margin: '0 0 15px 0' }}>DADOS DO CLIENTE</h4>
              <input
                placeholder="Nome Completo *"
                style={styles.input}
                value={cliente.nome || ""}
                onChange={e => setCliente({ ...cliente, nome: e.target.value })}
              />

              <input
                placeholder="WhatsApp (com DDD) *"
                style={styles.input}
                value={cliente.dsTelefone || ""}
                onChange={e => {
                  const valor = e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
                  const novoCliente = { ...cliente, dsTelefone: valor };
                  setCliente(novoCliente);
                  localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(novoCliente)); // Grava na hora
                }}
              />

              <input
                placeholder="CPF *"
                style={styles.input}
                value={cliente.cpf || ""}
                onChange={e => setCliente({ ...cliente, cpf: aplicarMascaraCPF(e.target.value) })}
              />
              {!cpfValido && <p style={{ color: '#ff4d4d', fontSize: '12px', marginTop: '-5px', marginBottom: '10px', fontWeight: 'bold' }}>⚠️ Número de CPF inválido</p>}
              {temFrete ? (
                <>
                  <h4 style={{ color: config.corTexto, margin: '15px 0 10px 0' }}>ENDEREÇO DE ENTREGA</h4>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input placeholder="CEP *" style={{ ...styles.input, flex: 1 }} value={cliente.cep} onChange={e => setCliente({ ...cliente, cep: aplicarMascaraCEP(e.target.value) })} />
                    <input placeholder="Nº *" style={{ ...styles.input, width: '70px' }} value={endereco.numero} onChange={e => setEndereco({ ...endereco, numero: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <input placeholder="Complemento / Ponto de referência" style={styles.input} value={endereco.complemento || ""} onChange={e => setEndereco({ ...endereco, complemento: e.target.value })} />
                  <input placeholder="Rua / Avenida" value={endereco.rua} style={styles.input} readOnly />
                  <input placeholder="Bairro" value={endereco.bairro} style={styles.input} readOnly />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input placeholder="Cidade" value={endereco.cidade} style={{ ...styles.input, flex: 2 }} readOnly />
                    <input placeholder="UF" value={endereco.uf} style={{ ...styles.input, flex: 1 }} readOnly />
                  </div>
                  {loadingFrete && <p style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>Calculando formas de entrega...</p>}
                  <div style={styles.freteGrid}>
                    {opcoesFrete.map(f => (
                      <button key={f.id} type="button" onClick={() => { setFreteSel(f); if (f.id !== "frete_gratis_ativado") setFreteBackup(f); }} style={{ ...styles.freteCard, borderColor: freteSel?.id === f.id ? config.corDestaque : '#eee', background: freteSel?.id === f.id ? config.corSecundaria : '#fff', color: config.corTexto }}>
                        <small style={{ display: 'block', fontSize: '10px' }}>{f.name}</small>
                        <b style={{ display: 'block', fontSize: '12px' }}>{f.price === 0 ? "Grátis" : "R$ " + Number(f.price).toFixed(2).replace('.', ',')}</b>
                      </button>
                    ))}
                  </div>
                </>
              ) : safeCart.length > 0 && (
                <div style={{ padding: '15px', marginTop: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', textAlign: 'center' }}>
                  <Mail size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Este é um pedido 100% digital!</p>
                  <p style={{ margin: '5px 0 0', fontSize: '12px' }}>O envio será feito via e-mail após a confirmação do pagamento.</p>
                </div>
              )}
            </div>
          </div>
          <div style={summaryColumnStyle}>
            <div style={styles.card}>
              <h3 style={{ color: config.corTexto, textAlign: 'center', margin: '0 0 15px 0' }}>RESUMO DO PEDIDO</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '15px', fontSize: '14px' }}>
                <div style={styles.rowBetween}><span style={{ color: '#64748b' }}>Total dos Produtos:</span><span style={{ fontWeight: '500', color: '#1e293b' }}>R$ {valorSubtotalProdutos.toFixed(2).replace('.', ',')}</span></div>
                {valorDesconto > 0 && (<div style={styles.rowBetween}><span style={{ color: '#2ecc71' }}>Cupom de Desconto:</span><span style={{ color: '#2ecc71', fontWeight: '500' }}>- R$ {valorDesconto.toFixed(2).replace('.', ',')}</span></div>)}
                <div style={styles.rowBetween}><span style={{ color: '#64748b' }}>Sub total:</span><span style={{ fontWeight: '500', color: '#1e293b' }}>R$ {valorSubTotalComDesconto.toFixed(2).replace('.', ',')}</span></div>
                {temFrete && (
                  <div style={styles.rowBetween}>
                    <span style={{ color: '#64748b' }}>Total de Frete:</span>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{freteGratisConfig.ativo && freteGratisConfig.atingido ? "Grátis" : freteSel ? (freteSel.price === 0 ? "Grátis" : "R$ " + Number(freteSel.price).toFixed(2).replace('.', ',')) : "R$ 0,00"}</span>
                  </div>
                )}
              </div>
              <hr style={{ border: 'none', borderTop: '2px solid #f6f9fc', margin: '10px 0' }} />
              <div style={styles.rowBetween}><span style={{ fontWeight: 'bold', fontSize: '16px', color: config.corTexto }}>Pagamento total:</span><span style={{ fontWeight: 'bold', fontSize: '18px', color: config.corTexto }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</span></div>
              <div style={{ padding: '15px 0', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>Possui cupom?</p>
                <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                  <input placeholder="Digite aqui" value={cupomDigitado} onChange={e => setCupomDigitado(e.target.value)} style={{ ...styles.input, marginBottom: 0, fontSize: 12, flex: 1 }} />
                  {descontoAtivo.valor > 0 && (<button onClick={limparCupom} style={{ background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer' }}><X size={16} /></button>)}
                </div>
                <button onClick={aplicarCupom} style={{ width: '100%', background: config.corTexto, color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: 11 }}>APLICAR CUPOM</button>
              </div>
              <div style={{ marginTop: '15px' }}>
                {temCheckoutOnlineAtivo() ? (
                  <div style={{ ...styles.pixBox, borderColor: '#2ecc71', backgroundColor: '#f4fbf7' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#27ae60', textAlign: 'center' }}>Checkout Online Ativo</p>
                  </div>
                ) : (
                  qrCodeUrl ? (
                    <div style={styles.pixBox}>
                      <img src={qrCodeUrl} alt="PIX" style={{ width: 150, height: 150 }} />
                      <button onClick={() => { navigator.clipboard.writeText(dadosLoja?.chavePix || dadosLoja?.pix || ""); alert("Copiado!"); }} style={{ ...styles.btnAction, backgroundColor: '#3498db', fontSize: 11, padding: '10px', color: '#fff', marginTop: 0 }}>COPIAR PIX</button>
                    </div>
                  ) : <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#666' }}>Pagamento via PIX</div>
                )}
              </div>
              <button
                onClick={finalizarNoWhatsApp}
                disabled={!podeFinalizar}
                style={{
                  ...styles.btnAction,
                  backgroundColor: dadosLoja?.lojaAberta === false ? '#94a3b8' : (podeFinalizar ? '#25D366' : '#ccc'),
                  color: podeFinalizar ? '#fff' : '#666',
                  cursor: podeFinalizar ? 'pointer' : 'not-allowed'
                }}
              >
                {dadosLoja?.lojaAberta === false ? 'PEDIDOS BLOQUEADOS (MODO VITRINE)' : (podeFinalizar ? (temCheckoutOnlineAtivo() ? 'FINALIZAR PAGAMENTO' : 'FINALIZAR NO WHATSAPP') : 'PREENCHA OS DADOS')}
              </button>
              <button
                onClick={limparTudo}
                style={{
                  ...styles.btnClean,
                  padding: '10px',
                  border: '1px solid #f70808',
                  borderRadius: '8px',
                  marginTop: '20px'
                }}
              >
                &times; LIMPAR CARRINHO E DADOS
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const summaryColumnStyle: React.CSSProperties = { flex: '1 1 300px', width: '100%', boxSizing: 'border-box' };

const headerStyles: Record<string, React.CSSProperties> = {
  headerContainer: { position: 'fixed', top: 0, left: 0, width: '100%', height: '115px', zIndex: 1000 },
  headerContent: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' },
  leftGroup: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' },
  btnBack: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 },
  logoBox: { display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', overflow: 'hidden', maxWidth: 'calc(100% - 50px)' },
  logoWrapper: { width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', overflow: 'hidden', background: '#fff', flexShrink: 0 },
  nomeLojaText: { fontSize: '20px', color: 'white', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', letterSpacing: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};

const styles: Record<string, React.CSSProperties> = {
  grid: { display: 'flex', gap: 20, flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' },
  mainColumn: { flex: '2 1 600px', width: '100%', boxSizing: 'border-box' },
  card: { background: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f5f5f5', gap: 10, width: '100%', boxSizing: 'border-box' },
  varText: { margin: '2px 0 0', fontSize: 13, color: '#475569', fontWeight: '400' },
  controls: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  qtyBtn: { background: '#eee', border: 'none', borderRadius: 5, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px' },
  btnDel: { background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: 0 },
  input: { width: '100%', padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #eee', outline: 'none', boxSizing: 'border-box', fontSize: '14px' },
  freteGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, width: '100%' },
  freteCard: { padding: 8, border: '2px solid', borderRadius: 10, cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  pixBox: { marginTop: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', border: '1px dashed #3498db', borderRadius: '10px', width: '100%', boxSizing: 'border-box' },
  btnAction: { width: '100%', padding: 15, border: 'none', borderRadius: 10, fontWeight: 'bold', marginTop: 10, cursor: 'pointer', boxSizing: 'border-box', transition: '0.2s' },
  btnClean: { background: 'none', border: 'none', color: '#999', fontSize: 11, marginTop: 15, cursor: 'pointer', width: '100%', textAlign: 'center' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain' }
};