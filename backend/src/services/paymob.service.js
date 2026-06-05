export const createPaymobOrder = async (amountCents, user, { returnUrl } = {}) => {
  if (!process.env.PAYMOB_API_KEY) {
    throw new Error("PAYMOB_API_KEY is not configured");
  }

  const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID_CARD);
  if (!integrationId) throw new Error("PAYMOB_INTEGRATION_ID_CARD is not configured");

  const res = await fetch("https://accept.paymob.com/v1/intention/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${process.env.PAYMOB_API_KEY}`
    },
    body: JSON.stringify({
      amount: amountCents,
      currency: "EGP",
      payment_methods: [integrationId],
      items: [],
      billing_data: {
        first_name: user.full_name?.split(" ")[0] || "Customer",
        last_name: user.full_name?.split(" ")[1] || "Name",
        email: user.email || "customer@peak.com",
        phone_number: user.phone || "01000000000"
      },
      ...(returnUrl ? { redirection_url: returnUrl } : {})
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymob intention failed: ${err}`);
  }

  const data = await res.json();
  const paymentKey = data.payment_keys?.[0]?.key;
  if (!paymentKey) throw new Error("Paymob payment key missing");

  const iframeId = process.env.PAYMOB_IFRAME_ID;
  const checkoutUrl = iframeId && iframeId !== "0"
    ? `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`
    : `https://accept.paymob.com/api/acceptance/pay?payment_token=${paymentKey}`;

  return {
    checkoutUrl,
    orderId: String(data.intention_order_id || data.id)
  };
};
