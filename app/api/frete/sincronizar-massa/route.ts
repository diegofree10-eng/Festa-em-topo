import { NextResponse } from 'next/server';
//import { db } from '@/lib/firebaseAdmin';
import { dbAdmin as db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { lojistaId } = await request.json();
    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    
    if (!lojistaSnap.exists) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dadosLoja = lojistaSnap.data();
    const token = dadosLoja?.tokenMelhorEnvio;
    const baseUrl = dadosLoja?.melhorEnvioSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';

    // Busca pedidos com etiqueta pendente
    const pendentesSnap = await db.collection("lojistas").doc(lojistaId).collection("pedidos")
      .where("statusEtiqueta", "==", "pendente").get();

    let sucessos = 0;
    let falhasCount = 0;

    for (const doc of pendentesSnap.docs) {
      const data = doc.data();
      const idEtiqueta = data.idEtiquetaMelhorEnvio;

      if (!idEtiqueta) continue;

      // 1. Tenta pagar
      const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({ orders: [idEtiqueta] })
      });

      const checkoutData = await checkoutRes.json();

      // Verifica se o pagamento foi autorizado
      // A API do ME costuma retornar 200/201 se o checkout foi processado
      const foiPago = checkoutRes.ok && checkoutData.purchase;

      if (foiPago) {
        // 2. Gera PDF da etiqueta
        const printRes = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: "private", orders: [idEtiqueta] })
        });
        
        const printData = await printRes.json();
        
        await doc.ref.update({ 
          statusEtiqueta: 'paga',
          urlEtiqueta: printData.url || "",
          dataGeracaoEtiqueta: new Date().toISOString(),
          erroPagamento: null
        });
        
        sucessos++;
      } else {
        // 3. Tratamento de falha (Saldo insuficiente ou outros)
        falhasCount++;
        
        // Se for saldo insuficiente, mantemos como 'pendente' para o lojista poder tentar de novo
        // Se for erro de validação (ex: CEP inválido), podemos marcar como 'erro'
        const isSaldoInsuficiente = checkoutData.message?.toLowerCase().includes("saldo") || 
                                     JSON.stringify(checkoutData).includes("insufficient");

        if (!isSaldoInsuficiente) {
          await doc.ref.update({ 
            statusEtiqueta: 'erro',
            erroPagamento: checkoutData.message || "Erro desconhecido na transação"
          });
        }
      }
      
      // Delay de segurança obrigatório para evitar rate-limit do Melhor Envio
      await new Promise(r => setTimeout(r, 800));
    }

    return NextResponse.json({ 
      success: true, 
      sucessos, 
      falhas: falhasCount,
      mensagem: sucessos > 0 ? `${sucessos} pagos com sucesso.` : "Saldo insuficiente ou erro em todos os pedidos."
    });

  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}