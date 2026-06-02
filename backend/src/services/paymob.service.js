export const createPaymobOrder = async (amountCents, user) => {
  if (!process.env.PAYMOB_API_KEY) {
    throw new Error("PAYMOB_API_KEY is not configured");
  }

  const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
  });
  if (!authRes.ok) throw new Error("Paymob authentication failed");
  const { token } = await authRes.json();
  if (!token) throw new Error("Paymob authentication token missing");

  const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount_cents: amountCents, currency: "EGP", items: [] })
  });
  if (!orderRes.ok) throw new Error("Paymob order creation failed");
  const order = await orderRes.json();

  const keyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount_cents: amountCents,
      expiration: 3600,
      order_id: order.id,
      currency: "EGP",
      integration_id: process.env.PAYMOB_INTEGRATION_ID_CARD,
      billing_data: {
        first_name: user.full_name?.split(" ")[0] || "Customer",
        last_name: user.full_name?.split(" ")[1] || "Name",
        email: user.email || "customer@peak.com",
        phone_number: user.phone || "01000000000",
        country: "EG",
        city: "Cairo",
        street: "NA",
        building: "NA",
        floor: "NA",
        apartment: "NA"
      }
    })
  });
  if (!keyRes.ok) throw new Error("Paymob payment key creation failed");
  const { token: paymentToken } = await keyRes.json();
  if (!paymentToken) throw new Error("Paymob payment token missing");

  const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
  return { checkoutUrl, orderId: String(order.id) };
};
