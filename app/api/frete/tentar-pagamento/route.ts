import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { lojistaId, pedidoId } = await request.json();

    const pedidoRef = db.collection("lojistas").doc(lojistaId).collection("pedidos").doc(pedidoId);
    const pedidoSnap = await pedidoRef.get();
    
    if (!pedidoSnap.exists) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const pedidoData = pedidoSnap.data();
    
    // FONTE DA VERDADE: Apenas o idEtiquetaMelhorEnvio serve para pagar.
    // O transportadoraId (ou dsTransportadoraId) serve apenas para COTAÇÃO.
    const orderIdMelhorEnvio = pedidoData?.idEtiquetaMelhorEnvio;

    if (!orderIdMelhorEnvio) {
      return NextResponse.json({ error: "ID da etiqueta (idEtiquetaMelhorEnvio) não encontrado no pedido." }, { status: 400 });
    }

    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    const dadosLoja = lojistaSnap.data();
    const token = dadosLoja?.tokenMelhorEnvio;
    const isSandbox = dadosLoja?.melhorEnvioSandbox === true;
    const baseUrl = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';

    // 1. Checkout (Pagamento)
    const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ orders: [orderIdMelhorEnvio] })
    });

    const checkoutData = await checkoutRes.json();
    
    // Verificação de sucesso baseada na resposta da API
    const eSucesso = checkoutRes.ok && checkoutData.purchase && checkoutData.purchase.status !== 'pending';

    if (!eSucesso) {
      const msgErro = checkoutData.message || (checkoutData.purchase?.status === 'pending' ? "Saldo insuficiente." : "Erro na transação.");
      
      await pedidoRef.update({
        statusEtiqueta: 'pendente', // Mantém como pendente para nova tentativa
        erroPagamento: msgErro
      });

      return NextResponse.json({ success: false, message: msgErro }, { status: 400 });
    }

    // 2. Imprime a etiqueta
    const printRes = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ mode: "private", orders: [orderIdMelhorEnvio] })
    });
    
    const printData = await printRes.json();

    await pedidoRef.update({
      statusEtiqueta: 'paga',
      urlEtiqueta: printData.url || "",
      dataGeracaoEtiqueta: new Date().toISOString(),
      erroPagamento: null
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}