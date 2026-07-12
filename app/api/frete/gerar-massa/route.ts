import { NextResponse } from "next/server";
//import { db } from '@/lib/firebaseAdmin';
import { dbAdmin as db } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { lojistaId, orders } = await request.json();

    if (!lojistaId || !orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists)
      return NextResponse.json(
        { error: "Lojista não encontrado." },
        { status: 404 },
      );

    const dadosLoja = lojistaSnap.data();
    const token = dadosLoja?.tokenMelhorEnvio;
    const isSandbox = dadosLoja?.melhorEnvioSandbox === true;
    const baseUrl = isSandbox
      ? "https://sandbox.melhorenvio.com.br"
      : "https://melhorenvio.com.br";

    const results = [];
    const errors = [];

    for (const p of orders) {
      const itensFisicos = (p.itens || []).filter(
        (item: any) => item.precisaFrete !== false,
      );
      if (itensFisicos.length === 0) continue;

      const totalFisico = itensFisicos.reduce(
        (acc: any, item: any) => {
          const qty = Number(item.qty || item.quantidade || 1);
          return {
            peso: acc.peso + Number(item.peso || 0.3) * qty,
            largura: Math.max(acc.largura, Number(item.largura || 15)),
            altura: Math.max(acc.altura, Number(item.altura || 10)),
            comprimento: Math.max(
              acc.comprimento,
              Number(item.comprimento || 15),
            ),
            valor: acc.valor + Number(item.preco || item.price || 0) * qty,
          };
        },
        { peso: 0, largura: 0, altura: 0, comprimento: 0, valor: 0 },
      );

      const serviceId = Number(p.financeiro?.dsTransportadoraId);
      const pedidoRef = db
        .collection("lojistas")
        .doc(lojistaId)
        .collection("pedidos")
        .doc(p.id);

      // Substitua o objeto payloadCart atual por este:
      const payloadCart = {
        service: serviceId,
        from: {
          name: dadosLoja?.nomeLoja || "Minha Loja",
          phone: dadosLoja?.whatsapp || "",
          email: dadosLoja?.email || "contato@loja.com",
          document: dadosLoja?.cnpj || "",
          address: dadosLoja?.ruaOrigem || "Endereço não informado",
          number: dadosLoja?.numeroOrigem || "S/N",
          district: dadosLoja?.bairroOrigem || "",
          city: dadosLoja?.cidadeOrigem || "",
          state_abbr: dadosLoja?.ufOrigem || "SP",
          postal_code: dadosLoja?.cepOrigem || "",
        },
        to: {
          name: p.cliente?.nmNome || p.cliente?.nome || "Cliente",
          phone: p.cliente?.dsTelefone || p.cliente?.telefone || "",
          email: p.cliente?.dsEmail || p.cliente?.email || "",
          document: p.cliente?.dsCpf || p.cliente?.cpf || "",
          address: p.endereco?.dsRua || p.endereco?.rua || "",
          number: p.endereco?.dsNumero || p.endereco?.numero || "",
          complement: p.endereco?.dsComplemento || "",
          district: p.endereco?.dsBairro || p.endereco?.bairro || "",
          city: p.endereco?.dsCidade || p.endereco?.cidade || "",
          state_abbr: p.endereco?.dsUf || p.endereco?.uf || "",
          postal_code: p.endereco?.dsCep || p.endereco?.cep || "",
        },
        products: (p.itens || []).map((item: any) => ({
          name: item.dsNome || item.nome || "Produto",
          quantity: Number(item.nrQuantidade || item.quantidade || 1),
          unitary_value: Number(item.preco || 0),
        })),
        volumes: [
          {
            width: Math.max(11, Math.ceil(totalFisico.largura)),
            height: Math.max(2, Math.ceil(totalFisico.altura)),
            length: Math.max(16, Math.ceil(totalFisico.comprimento)),
            weight: Math.max(0.1, totalFisico.peso),
          },
        ],
        options: {
          insurance_value: totalFisico.valor,
          non_commercial: true,
          platform: "FestaEmTopo",
          note: p.financeiro?.metodo,
        },
      };

      const cartRes = await fetch(`${baseUrl}/api/v2/me/cart`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payloadCart),
      });

      const cartData = await cartRes.json();

      if (!cartRes.ok) {
        errors.push({
          pedido: p.id,
          message: cartData.message || "Erro no carrinho",
        });
        continue;
      }

      const checkoutRes = await fetch(
        `${baseUrl}/api/v2/me/shipment/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ orders: [cartData.id] }),
        },
      );

      const checkoutData = await checkoutRes.json();

      if (checkoutRes.ok) {
        // Extrai o rastreio do primeiro item do array de retorno (padrão Melhor Envio)
        const rastreio = checkoutData[0]?.tracking || null;

        await pedidoRef.update({
          etiquetaGerada: true,
          idEtiquetaMelhorEnvio: cartData.protocol,
          statusEtiqueta: "paga",
          dataGeracaoEtiqueta: new Date().toISOString(),
          // Campo padronizado para o sistema multiloja
          dsNumRastreio: rastreio,
        });
        results.push({ pedido: p.id, status: "sucesso" });
      } else {
        console.error("--- ERRO NO CHECKOUT (MELHOR ENVIO) ---");
        console.error("Pedido ID:", p.id);
        console.error(
          "Detalhes do erro:",
          JSON.stringify(checkoutData, null, 2),
        );
        console.error("---------------------------------------");

        let msgErro =
          checkoutData.error || checkoutData.message || "Erro desconhecido";
        if (
          typeof msgErro === "string" &&
          msgErro.toLowerCase().includes("saldo")
        ) {
          msgErro =
            "Saldo insuficiente no Melhor Envio. Adicione créditos para continuar.";
        }
        await pedidoRef.update({
          etiquetaGerada: false,
          statusPagamento: "erro",
          erroPagamento: msgErro,
        });
        errors.push({ pedido: p.id, message: msgErro });
      }
    }

    return NextResponse.json({ success: true, results, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
