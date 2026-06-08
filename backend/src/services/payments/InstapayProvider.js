import crypto from "crypto";
import { BasePaymentProvider } from "./BasePaymentProvider.js";

export class InstapayProvider extends BasePaymentProvider {
  constructor() {
    super();
    this.ipaAlias = process.env.INSTAPAY_IPA_ALIAS || "peakacademy@instapay";
    this.merchantName = process.env.INSTAPAY_MERCHANT_NAME || "Peak Academy";
    this.webhookSecret = process.env.INSTAPAY_WEBHOOK_SECRET;
  }

  _generateReference(orderId) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = String(orderId).slice(-4).toUpperCase();
    return `PA-${date}-${suffix}`;
  }

  async createOrder({ amount, orderId, metadata: _metadata = {} }) {
    const amountEGP = (amount / 100).toFixed(2);
    const referenceCode = this._generateReference(orderId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      providerOrderId: referenceCode,
      referenceCode,
      ipaAlias: this.ipaAlias,
      amountEGP,
      expiresAt,
      paymentMethod: "instapay",
      instructions: [
        "افتح تطبيق البنك أو تطبيق إنستاباي",
        'اختر "تحويل فوري InstaPay"',
        `أرسل مبلغ ${amountEGP} جنيه إلى: ${this.ipaAlias}`,
        `في خانة البيان أو الوصف اكتب: ${referenceCode}`,
        "أرسل إيصال التحويل عبر الدعم أو ارفعه في الصفحة التالية"
      ].join("\n"),
      metadata: {
        requiresManualVerification: true,
        referenceCode,
        ipaAlias: this.ipaAlias
      }
    };
  }

  async verifyManually({ orderId, adminId, bankTransactionRef }) {
    return {
      isValid: true,
      orderId,
      transactionId: bankTransactionRef || `MANUAL-${Date.now()}`,
      status: "success",
      verifiedBy: adminId,
      metadata: { manualVerification: true }
    };
  }

  async handleWebhook(payload, signature) {
    if (this.webhookSecret && signature) {
      const expected = crypto.createHmac("sha256", this.webhookSecret).update(JSON.stringify(payload)).digest("hex");
      if (expected !== signature) {
        return { isValid: false };
      }
    }

    return {
      isValid: true,
      orderId: payload.referenceCode || payload.reference,
      transactionId: payload.transactionId || payload.id,
      status: payload.status === "success" ? "success" : "pending",
      amount: Math.round(parseFloat(payload.amount || 0) * 100),
      metadata: payload
    };
  }

  async getTransactionStatus(referenceCode) {
    return {
      status: "pending",
      transactionId: referenceCode,
      amount: 0,
      metadata: { note: "InstaPay requires manual verification" }
    };
  }
}
