import crypto from "crypto";
import { BasePaymentProvider } from "./BasePaymentProvider.js";

export class VodafoneCashProvider extends BasePaymentProvider {
  constructor() {
    super();
    this.apiKey = process.env.PAYMOB_API_KEY;
    this.integrationId = process.env.PAYMOB_WALLET_INTEGRATION_ID || process.env.PAYMOB_INTEGRATION_ID_WALLET;
    this.hmacSecret = process.env.PAYMOB_HMAC_SECRET;

    if (!this.apiKey || !this.integrationId) {
      throw new Error("PAYMOB_API_KEY and PAYMOB_WALLET_INTEGRATION_ID are required for Vodafone Cash");
    }
  }

  async _getAuthToken() {
    const response = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: this.apiKey })
    });
    if (!response.ok) throw new Error("Paymob auth failed");
    const data = await response.json();
    return data.token;
  }

  async _registerOrder(authToken, { amount, orderId }) {
    const response = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
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
    if (!response.ok) throw new Error("Paymob order registration failed");
    return response.json();
  }

  async _getPaymentKey(authToken, { paymobOrderId, amount, customer }) {
    const response = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amount,
        expiration: 3600,
        order_id: paymobOrderId,
        currency: "EGP",
        integration_id: parseInt(this.integrationId, 10),
        billing_data: {
          first_name: customer.name?.split(" ")[0] || "NA",
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
    if (!response.ok) throw new Error("Paymob payment key failed");
    const data = await response.json();
    return data.token;
  }

  async createOrder({ amount, orderId, customer, metadata: _metadata = {} }) {
    const authToken = await this._getAuthToken();
    const order = await this._registerOrder(authToken, { amount, orderId });
    const paymentKey = await this._getPaymentKey(authToken, {
      paymobOrderId: order.id,
      amount,
      customer
    });

    const walletResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          identifier: customer.phone,
          subtype: "WALLET"
        },
        payment_token: paymentKey
      })
    });

    const data = await walletResponse.json();

    return {
      providerOrderId: String(order.id),
      paymentUrl: data.redirect_url,
      paymentToken: paymentKey,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      paymentMethod: "vodafone_cash",
      instructions: `سيصلك رسالة على رقم ${customer.phone} لتأكيد الدفع. افتح الرابط وادخل PIN محفظتك.`,
      metadata: { paymobOrderId: order.id, walletResponse: data }
    };
  }

  async handleWebhook(payload, signature) {
    const hmacFields = [
      "amount_cents",
      "created_at",
      "currency",
      "error_occured",
      "has_parent_transaction",
      "id",
      "integration_id",
      "is_3d_secure",
      "is_auth",
      "is_capture",
      "is_refunded",
      "is_standalone_payment",
      "is_voided",
      "order",
      "owner",
      "pending",
      "source_data.pan",
      "source_data.sub_type",
      "source_data.type",
      "success"
    ];

    const getVal = (obj, path) => path.split(".").reduce((acc, k) => acc?.[k], obj);
    const obj = payload?.obj || payload;

    const concatenated = hmacFields.map((f) => String(getVal(obj, f) ?? "")).join("");
    const expected = crypto.createHmac("sha512", this.hmacSecret || "").update(concatenated).digest("hex");

    const isValid = this.hmacSecret ? expected === signature : false;
    const isSuccess = obj.success === true || obj.success === "true";

    return {
      isValid,
      orderId: String(obj.order?.merchant_order_id || obj.order?.id || ""),
      transactionId: String(obj.id || ""),
      status: isSuccess ? "success" : obj.pending ? "pending" : "failed",
      amount: parseInt(obj.amount_cents || 0, 10),
      metadata: obj
    };
  }

  async getTransactionStatus(paymobOrderId) {
    const authToken = await this._getAuthToken();
    const response = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobOrderId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!response.ok) {
      return { status: "pending", transactionId: "", amount: 0, metadata: {} };
    }
    const data = await response.json();
    const tx = data.transactions?.[0];
    return {
      status: tx?.success ? "success" : tx?.pending ? "pending" : "failed",
      transactionId: String(tx?.id || ""),
      amount: parseInt(data.amount_cents || 0, 10),
      metadata: data
    };
  }
}
