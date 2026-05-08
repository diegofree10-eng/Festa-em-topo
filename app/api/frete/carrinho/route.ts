import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pedido, lojistaId } = body; // Agora recebemos o lojistaId do front-end

    // 1. Validação básica
    if (!pedido || !pedido.itens || !pedido.endereco || !lojistaId) {
        return NextResponse.json({ error: 'Dados do pedido ou lojistaId incompletos' }, { status: 400 });
    }

    // 2. BUSCA O TOKEN DINÂMICO NO DOCUMENTO DO LOJISTA (Conforme imagem 42.png)
    const lojistaRef = doc(db, "lojistas", lojistaId);
    const lojistaSnap = await getDoc(lojistaRef);
    
    if (!lojistaSnap.exists()) {
       return NextResponse.json({ error: 'Lojista não encontrado no banco de dados.' }, { status: 404 });
    }

    const dadosLojista = lojistaSnap.data();
    const TOKEN_DINAMICO = dadosLojista.tokenMelhorEnvio; // Campo identificado na imagem 42.png
    const CEP_ORIGEM = dadosLojista.cep; // Campo 'cep' no documento do lojista

    if (!TOKEN_DINAMICO) {
       return NextResponse.json({ error: 'Este lojista não possui Token do Melhor Envio configurado.' }, { status: 500 });
    }

    // 3. Montagem do Payload para o Melhor Envio
    const totalPedido = Number(pedido.financeiro?.total || 0);

    const payload = {
      service: 3, // Jadlog Package
      from: {
        name: "Festa em Topo",
        phone: "12991823317",
        email: "danielleksc16@gmail.com",
        document: "38625294871",
        address: dadosLojista.rua || "Endereço não definido", // Busca a rua do lojista
        number: "57",
        district: "Jd.Uirá",
        city: dadosLojista.cidade || "São José dos Campos",
        state_abbr: "SP",
        postal_code: String(CEP_ORIGEM).replace(/\D/g, "") // CEP dinâmico da loja
      },
      to: {
        name: pedido.cliente || "Cliente",
        phone: pedido.whatsapp?.replace(/\D/g, "") || "12981654900",
        email: "danielleksc16@gmail.com",
        document: String(pedido.cpf || "").replace(/\D/g, ""),
        address: pedido.endereco.rua || "",
        number: pedido.endereco.numero || "S/N",
        district: pedido.endereco.bairro || "",
        city: pedido.endereco.cidade || "",
        state_abbr: pedido.endereco.uf || "",
        postal_code: String(pedido.endereco.cep || "").replace(/\D/g, "")
      },
      products: pedido.itens.map((item: any) => ({
        name: String(item.nome || "Produto Personalizado").substring(0, 40),
        quantity: Number(item.qty || 1),
        unitary_value: Number(totalPedido / (pedido.itens?.length || 1)).toFixed(2)
      })),
      volumes: [{
        height: 3,
        width: 22,
        length: 30,
        weight: 0.2
      }],
      options: {
        insurance_value: totalPedido,
        non_commercial: true 
      }
    };

    // 4. ENVIO PARA O CARRINHO DO MELHOR ENVIO
    const response = await fetch('https://melhorenvio.com.br/api/v2/me/cart', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_DINAMICO.trim()}`,
        'User-Agent': 'FestaEmTopo (danielleksc16@gmail.com)'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro no retorno do Melhor Envio:", data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Erro Crítico na Rota de Frete:", error);
    return NextResponse.json(
      { error: 'Erro interno', details: error.message }, 
      { status: 500 }
    );
  }
};