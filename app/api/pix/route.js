import { MercadoPagoConfig, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export async function POST(req) {
  try {
    const body = await req.json();

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: Number(body.amount),
        payment_method_id: "pix",
        description: "Pedido Loja",
        payer: {
          email: body.email || "teste@email.com"
        }
      }
    });

    const pix = result?.point_of_interaction?.transaction_data;

    return Response.json({
      qr_code: pix?.qr_code || "",
      qr_base64: pix?.qr_code_base64 || ""
    });

  } catch (err) {
    console.error(err);

    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}