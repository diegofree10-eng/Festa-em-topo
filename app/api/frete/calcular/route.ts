import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from "firebase/firestore";

export async function POST(request) {
  try {
    const { cepDestino, pacote, lojistaId } = await request.json();

    if (!lojistaId) {
      return NextResponse.json({ error: "ID do lojista não fornecido" }, { status: 400 });
    }

    // 1. Busca os dados do lojista no Firestore
    const lojistaSnap = await getDoc(doc(db, "lojistas", lojistaId));
    
    if (!lojistaSnap.exists()) {
      return NextResponse.json({ error: "Lojista não encontrado" }, { status: 404 });
    }

    const dados = lojistaSnap.data();
    const token = dados.tokenMelhorEnvio; // Identificado na imagem 42.png
    
    // CORREÇÃO CRÍTICA: O Melhor Envio exige CEP apenas com números.
    // Na imagem 43.png, o CEP está "12227-690". Vamos remover o hífen aqui.
    const cepOrigemLimpo = dados.cep ? dados.cep.replace(/\D/g, "") : "";
    const cepDestinoLimpo = cepDestino ? cepDestino.replace(/\D/g, "") : "";

    if (!token || !cepOrigemLimpo) {
      return NextResponse.json({ error: "Token ou CEP de origem não configurados" }, { status: 400 });
    }

    // 2. Chamada para a API do Melhor Envio
    const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.trim()}`,
        'User-Agent': 'FestaEmTopo (danielleksc16@gmail.com)'
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigemLimpo },
        to: { postal_code: cepDestinoLimpo },
        package: {
          width: Number(pacote.largura),
          height: Number(pacote.altura),
          length: Number(pacote.comprimento),
          weight: Number(pacote.peso)
        }
      })
    });

    const fretes = await response.json();

    if (!response.ok) {
      console.error("Erro Melhor Envio:", fretes);
      return NextResponse.json({ error: "Erro na cotação", detalhes: fretes }, { status: response.status });
    }

    // 3. Filtrar apenas transportadoras que retornaram preço (evita cards vazios)
    const opcoesValidas = Array.isArray(fretes) 
      ? fretes.filter(f => !f.error && f.price) 
      : [];

    return NextResponse.json(opcoesValidas);

  } catch (error) {
    console.error("Erro interno na rota de frete:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}