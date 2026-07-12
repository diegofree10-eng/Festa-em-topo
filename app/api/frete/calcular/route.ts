import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 🎯 RECEBENDO OS ITENS DO FRONT-END
    const { cepDestino, pacote, lojistaId, itensFiltrados } = body;

    if (!lojistaId || !cepDestino) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    const lojistaSnap = await getDoc(doc(db, "lojistas", lojistaId));
    if (!lojistaSnap.exists()) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dados = lojistaSnap.data();
    const token = dados?.tokenMelhorEnvio; 
    const cepOrigem = String(dados?.cep || dados?.CEP || "").replace(/\D/g, "");
    const transportadorasAtivas = dados?.transportadoras || {};

    if (!token || !cepOrigem) {
      return NextResponse.json({ error: "Configuração de Frete incompleta no Firebase." }, { status: 400 });
    }

    // 🎯 REGRAS PARA CARRINHO MISTO / SEM FRETE:
    // Filtra para manter na cubagem APENAS os itens que precisam de frete físico
    const apenasItensComFrete = Array.isArray(itensFiltrados)
      ? itensFiltrados.filter((item: any) => item.precisaFrete !== false)
      : [];

    // Se o cliente enviou uma lista de itens, mas NENHUM deles precisa de frete,
    // significa que o carrinho é 100% digital. Não faz sentido cotar no Melhor Envio.
    if (Array.isArray(itensFiltrados) && itensFiltrados.length > 0 && apenasItensComFrete.length === 0) {
      return NextResponse.json([]); // Retorna vazio direto (o front tratará como Grátis/Digital)
    }

    // 🎯 CÁLCULO DINÂMICO DE PESO APENAS DOS PRODUTOS FÍSICOS
    let pesoTotalCalculado = 0;
    
    if (apenasItensComFrete.length > 0) {
      apenasItensComFrete.forEach((item: any) => {
        // Multiplica o peso individual cadastrado (ou o padrão 0.2kg) pela quantidade
        const pesoItem = Number(item.peso || item.weight || 0.2);
        const quantidade = Number(item.qty || item.quantity || 1);
        pesoTotalCalculado += pesoItem * quantidade;
      });
    } else {
      // Fallback de segurança caso a lista detalhada não venha do front
      pesoTotalCalculado = Number(pacote?.peso || 0.5);
    }

    // Garante limites mínimos aceitáveis para as transportadoras
    if (pesoTotalCalculado <= 0) pesoTotalCalculado = 0.1;

    const pacoteSeguro = {
      largura: Number(pacote?.largura || 20),
      altura: Number(pacote?.altura || 10),
      comprimento: Number(pacote?.comprimento || 20),
      peso: pesoTotalCalculado
    };

    const IsMelhorEnvioSandbox = dados?.melhorEnvioSandbox === true;
    const UrlMelhorEnvio = IsMelhorEnvioSandbox
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'
      : 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

    const response = await fetch(UrlMelhorEnvio, {
      
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${String(token).trim()}`,
        'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
      },
      
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino.replace(/\D/g, "") },
        volumes: [
          {
            width: pacoteSeguro.largura > 0 ? pacoteSeguro.largura : 20,
            height: pacoteSeguro.altura > 0 ? pacoteSeguro.altura : 10,
            length: pacoteSeguro.comprimento > 0 ? pacoteSeguro.comprimento : 20,
            weight: pacoteSeguro.peso
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("🚨 RESPOSTA DE ERRO DO MELHOR ENVIO:", response.status, errorText);
    }

    if (response.status === 401) {
      console.error("🚨 Melhor Envio retornou 401. Verifique se o token inserido é válido.");
      return NextResponse.json({ error: "Token do Melhor Envio inválido ou expirado." }, { status: 401 });
    }

    const responseText = await response.text();
    let data: any = {};

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ error: "Resposta inválida da API de frete." }, { status: 502 });
    }

    if (!response.ok || data.message) {
      return NextResponse.json({ error: data.message || "Falha na cotação." }, { status: response.status });
    }

    if (Array.isArray(data)) {
      const fretesFiltrados = data
        .filter((servico: any) => {
          if (servico.error) return false;

          const nomeEmpresa = String(servico.company?.name || "").toLowerCase();
          const nomeServico = String(servico.name || "").toLowerCase();

          if (Object.keys(transportadorasAtivas).length === 0) {
            return true;
          }

          if (nomeEmpresa.includes("correios") || nomeServico.includes("pac") || nomeServico.includes("sedex")) {
            return transportadorasAtivas.correios !== false; 
          }
          
          if (nomeEmpresa.includes("azul")) {
            return transportadorasAtivas.azul !== false;
          }

          if (nomeEmpresa.includes("jadlog")) {
            return transportadorasAtivas.jadlog !== false;
          }

          if (nomeEmpresa.includes("latam")) {
            return transportadorasAtivas.latam !== false;
          }

          return true; 
        })
        .map((servico: any) => ({
          id: servico.id,
          name: servico.name,
          company: servico.company?.name || "Transportadora",
          price: Number(servico.price),
          delivery_time: servico.delivery_time,
          custom_delivery_time: servico.custom_delivery_time
        }));

      return NextResponse.json(fretesFiltrados);
    }

    return NextResponse.json([]);

  } catch (error: any) {
    console.error("🚨 Erro na API de frete:", error);
    return NextResponse.json({ error: "Erro interno ao processar frete." }, { status: 500 });
  }
}