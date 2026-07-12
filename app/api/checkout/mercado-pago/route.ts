import mercadopago from "mercadopago";

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

export async function POST(req) {

  const { items, frete } = await req.json();

  const preference = {
    items: [
      ...items.map(i => ({
        title: i.name,
        quantity: i.qty,
        unit_price: i.price
      })),
      {
        title: "Frete",
        quantity: 1,
        unit_price: frete
      }
    ],
    auto_return: "approved"
  };

  const response = await mercadopago.preferences.create(preference);

  return Response.json({
    init_point: response.body.init_point
  });
}