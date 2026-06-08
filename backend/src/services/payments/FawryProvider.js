import crypto from "crypto";
import { BasePaymentProvider } from "./BasePaymentProvider.js";

const FAWRY_BASE_URL = process.env.FAWRY_BASE_URL || "https://atfawry.fawrystaging.com";

export class FawryProvider extends BasePaymentProvider {
  constructor() {
    super();
    this.merchantCode = process.env.FAWRY_MERCHANT_CODE;
    this.securityKey = process.env.FAWRY_SECURITY_KEY;

    if (!this.merchantCode || !this.securityKey) {
      throw new Error("FAWRY_MERCHANT_CODE and FAWRY_SECURITY_KEY are required");
    }
  }

  _generateSignature({ merchantRefNum, customerProfileId, chargeItems }) {
    const itemsStr = chargeItems
      .map((item) => `${item.itemId}${item.quantity}${item.price.toFixed(2)}`)
      .join("");
    const str = `${this.merchantCode}${merchantRefNum}${customerProfileId}${itemsStr}${this.securityKey}`;
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  async createOrder({ amount, orderId, userId, customer, metadata = {} }) {
    const amountEGP = (amount / 100).toFixed(2);

    const chargeItems = [
      {
        itemId: orderId,
        description: metadata.description || "Peak Academy Subscription",
        price: parseFloat(amountEGP),
        quantity: 1
      }
    ];

    const paymentExpiry = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    const body = {
      merchantCode: this.merchantCode,
      merchantRefNum: orderId,
      customerProfileId: userId,
      customerName: customer.name || "Customer",
      customerEmail: customer.email,
      customerMobile: customer.phone?.replace(/^0/, "+20"),
      paymentExpiry,
      chargeItems,
      returnUrl: `${frontendUrl}/payment/callback?provider=fawry`,
      authCaptureModePayment: false
    };

    body.signature = this._generateSignature({
      merchantRefNum: orderId,
      customerProfileId: userId,
      chargeItems
    });

    const response = await fetch(`${FAWRY_BASE_URL}/ECommerceWeb/Fawry/payments/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.statusCode !== 200 && data.type !== "ChargeResponse") {
      throw new Error(`Fawry error: ${data.statusDescription || "Unknown error"}`);
    }

    const referenceCode = data.referenceNumber;
    const expiresAt = new Date(paymentExpiry);

    return {
      providerOrderId: referenceCode,
      referenceCode,
      expiresAt,
      paymentMethod: "fawry",
      instructions: `احتفظ برقم الاستعلام: ${referenceCode}\nادفع في أي منفذ فوري أو من تطبيق فوري قبل ${expiresAt.toLocaleDateString("ar-EG")}`,
      metadata: { fawryResponse: data }
    };
  }

  async handleWebhook(payload, signature) {
    const expected = crypto
      .createHash("sha256")
      .update(
        `${this.merchantCode}${payload.merchantRefNum}${payload.paymentAmount}${payload.orderStatus}${this.securityKey}`
      )
      .digest("hex");

    const isValid = expected === signature;

    return {
      isValid,
      orderId: payload.merchantRefNum,
      transactionId: payload.fawryRefNumber,
      status:
        payload.orderStatus === "PAID" ? "success" : payload.orderStatus === "FAILED" ? "failed" : "pending",
      amount: Math.round(parseFloat(payload.paymentAmount) * 100),
      metadata: payload
    };
  }

  async getTransactionStatus(referenceNumber) {
    const signature = crypto
      .createHash("sha256")
      .update(`${this.merchantCode}${referenceNumber}${this.securityKey}`)
      .digest("hex");

    const url = new URL(`${FAWRY_BASE_URL}/ECommerceWeb/Fawry/payments/status/v2`);
    url.searchParams.set("merchantCode", this.merchantCode);
    url.searchParams.set("merchantRefNum", referenceNumber);
    url.searchParams.set("signature", signature);

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      status:
        data.paymentStatus === "PAID" ? "success" : data.paymentStatus === "FAILED" ? "failed" : "pending",
      transactionId: data.fawryRefNumber,
      amount: Math.round(parseFloat(data.paymentAmount || 0) * 100),
      metadata: data
    };
  }
}
