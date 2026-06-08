import { BasePaymentProvider } from "./BasePaymentProvider.js";

// Fawry payments go through Paymob's Fawry integration.
// Flow: auth → register order → payment key (Fawry integration) → pay (AGGREGATOR) → reference code.
export class FawryProvider extends BasePaymentProvider {
  async _paymobAuth() {
    const res = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
    });
    if (!res.ok) throw new Error("Paymob auth failed");
    const data = await res.json();
    return data.token;
  }

  async _registerOrder(authToken, { amount, orderId }) {
    const res = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amount,
        currency: "EGP",
        merchant_order_id: orderId,
        items: []
      })
    });
    if (!res.ok) throw new Error("Paymob order registration failed");
    return res.json();
  }

  async _getPaymentKey(authToken, { paymobOrderId, amount, customer, integrationId }) {
    const res = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amount,
        expiration: 3 * 24 * 3600,
        order_id: paymobOrderId,
        currency: "EGP",
        integration_id: parseInt(integrationId, 10),
        billing_data: {
          first_name: customer.name?.split(" ")[0] || "Customer",
          last_name: customer.name?.split(" ").slice(1).join(" ") || "NA",
          email: customer.email || "NA",
          phone_number: customer.phone || "NA",
          apartment: "NA",
          building: "NA",
          floor: "NA",
          street: "NA",
          city: "Cairo",
          country: "EG",
          state: "NA",
          postal_code: "NA"
        }
      })
    });
    if (!res.ok) throw new Error("Paymob payment key failed");
    const data = await res.json();
    return data.token;
  }

  async createOrder({ amount, orderId, customer, metadata: _metadata = {} }) {
    const integrationId =
      process.env.PAYMOB_INTEGRATION_ID_FAWRY ||
      process.env.PAYMOB_FAWRY_INTEGRATION_ID;

    if (!integrationId) {
      throw new Error("PAYMOB_INTEGRATION_ID_FAWRY is not configured");
    }
    if (!process.env.PAYMOB_API_KEY) {
      throw new Error("PAYMOB_API_KEY is not configured");
    }

    const authToken = await this._paymobAuth();
    const paymobOrder = await this._registerOrder(authToken, { amount, orderId });
    const paymentKey = await this._getPaymentKey(authToken, {
      paymobOrderId: paymobOrder.id,
      amount,
      customer,
      integrationId
    });

    // Get Fawry reference code via AGGREGATOR pay call
    const payRes = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: { identifier: "AGGREGATOR", subtype: "AGGREGATOR" },
        payment_token: paymentKey
      })
    });
    const payData = await payRes.json();

    const referenceCode = String(
      payData.bill_reference ||
      payData.reference_number ||
      paymobOrder.id
    );
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    return {
      providerOrderId: String(paymobOrder.id),
      referenceCode,
      expiresAt,
      paymentMethod: "fawry",
      amountEGP: (amount / 100).toFixed(2),
      instructions: `احتفظ برقم المرجع: ${referenceCode}\nادفع في أي منفذ فوري أو من تطبيق فوري قبل ${expiresAt.toLocaleDateString("ar-EG")}`,
      metadata: { paymobOrderId: paymobOrder.id, referenceCode, fawryResponse: payData }
    };
  }

  async handleWebhook(payload, signature) {
    // Fawry webhooks through Paymob use the standard Paymob HMAC format
    const { verifyPaymobHmacStrict } = await import("../../utils/paymob-security.js");
    const obj = payload?.obj || payload;
    const hmacResult = verifyPaymobHmacStrict(payload, signature);
    const isSuccess = obj?.success === true || obj?.success === "true";

    return {
      isValid: hmacResult.valid,
      orderId: String(obj?.order?.merchant_order_id || obj?.order?.id || ""),
      transactionId: String(obj?.id || ""),
      status: isSuccess ? "success" : obj?.pending ? "pending" : "failed",
      amount: parseInt(obj?.amount_cents || 0, 10),
      metadata: obj
    };
  }

  async getTransactionStatus(paymobOrderId) {
    const authToken = await this._paymobAuth();
    const res = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobOrderId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) return { status: "pending", transactionId: "", amount: 0, metadata: {} };
    const data = await res.json();
    const tx = data.transactions?.[0];

    return {
      status: tx?.success ? "success" : tx?.pending ? "pending" : "failed",
      transactionId: String(tx?.id || ""),
      amount: parseInt(data.amount_cents || 0, 10),
      metadata: data
    };
  }
}
