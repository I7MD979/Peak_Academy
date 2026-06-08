import { BasePaymentProvider } from "./BasePaymentProvider.js";
import { createPaymobOrder } from "../paymob.service.js";
import { verifyPaymobHmacStrict } from "../../utils/paymob-security.js";

export class PaymobProvider extends BasePaymentProvider {
  async createOrder({ amount, orderId, userId, customer, metadata = {} }) {
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const returnUrl =
      metadata.returnUrl ||
      `${frontendUrl}/student/subscription?paid=1&payment_id=${orderId}`;

    const user = {
      id: userId,
      full_name: customer.name || "Customer",
      email: customer.email,
      phone: customer.phone
    };

    const { checkoutUrl, orderId: paymobOrderId } = await createPaymobOrder(amount, user, { returnUrl });

    return {
      providerOrderId: paymobOrderId,
      iframeUrl: checkoutUrl,
      paymentUrl: checkoutUrl,
      paymentMethod: "paymob",
      instructions: "أكمل الدفع ببطاقتك البنكية في الصفحة التالية.",
      metadata: { paymobOrderId }
    };
  }

  async handleWebhook(payload, signature) {
    const obj = payload?.obj || payload;
    const hmacResult = verifyPaymobHmacStrict(payload, signature);
    const isValid = hmacResult.valid;
    const isSuccess = obj?.success === true || obj?.success === "true";

    return {
      isValid,
      orderId: String(obj?.order?.merchant_order_id || obj?.order?.id || ""),
      transactionId: String(obj?.id || ""),
      status: isSuccess ? "success" : obj?.pending ? "pending" : "failed",
      amount: parseInt(obj?.amount_cents || 0, 10),
      metadata: obj
    };
  }

  async getTransactionStatus(providerOrderId) {
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
    });
    if (!authRes.ok) {
      return { status: "pending", transactionId: "", amount: 0, metadata: {} };
    }
    const { token } = await authRes.json();

    const orderRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!orderRes.ok) {
      return { status: "pending", transactionId: "", amount: 0, metadata: {} };
    }

    const data = await orderRes.json();
    const tx = data.transactions?.[0];
    return {
      status: tx?.success ? "success" : tx?.pending ? "pending" : "failed",
      transactionId: String(tx?.id || ""),
      amount: parseInt(data.amount_cents || 0, 10),
      metadata: data
    };
  }
}
