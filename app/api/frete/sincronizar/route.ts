import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lojistaId, token, isSandbox } = body;

    if (!lojistaId || !token) {
      return NextResponse.json({ error: "Lojista ID e Token são obrigatórios" }, { status: 400 });
    }

    const baseUrl = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
    console.log(`[SYNC] Iniciando sincronização para ${lojistaId}`);

    const pedidosRef = db.collection("lojistas").doc(lojistaId).collection("pedidos");
    
    // Busca pedidos que já tiveram a etiqueta gerada mas ainda estão pendentes de pagamento
    const snapshot = await pedidosRef
      .where("etiquetaGerada", "==", true)
      .where("statusEtiqueta", "==", "pendente")
      .get();
    
    let atualizados = 0;

    for (const pDoc of snapshot.docs) {
      const pedido = pDoc.data();
      
      // FIX: Usar a chave correta onde o ID da etiqueta foi salvo durante o checkout
      const shipmentId = pedido.idEtiquetaMelhorEnvio; 

      if (!shipmentId) {
        console.warn(`[SYNC] Pedido ${pDoc.id} não possui idEtiquetaMelhorEnvio.`);
        continue;
      }

      try {
          const res = await fetch(`${baseUrl}/api/v2/me/shipment/orders/${shipmentId}`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Accept': 'application/json',
                'User-Agent': 'SuaApp (seu-email@exemplo.com)'
            }
          });
          
          const orderData = await res.json();

          if (!res.ok) {
              console.error(`[SYNC] Erro ME para etiqueta ${shipmentId}:`, orderData);
              continue;
          }

          // Melhor Envio retorna 'paid' quando o pagamento foi processado com sucesso
          if (orderData.status === 'paid') {
              await pDoc.ref.update({
                statusEtiqueta: 'paga',
                // Atualiza com a URL de impressão vinda diretamente da consulta da ordem
                urlEtiqueta: orderData.url || orderData.checkout?.url_print || "",
                dataGeracaoEtiqueta: new Date().toISOString()
              });
              atualizados++;
          }
      } catch (fetchError) {
          console.error(`[SYNC] Falha de conexão:`, fetchError);
      }
    }

    return NextResponse.json({ success: true, atualizados });
  } catch (error: any) {
    console.error("Erro fatal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}