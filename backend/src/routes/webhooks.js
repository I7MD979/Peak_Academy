import { Router } from "express";
import { PaymentFactory } from "../services/payments/PaymentFactory.js";
import { processProviderWebhook } from "../services/paymentWebhook.service.js";
import { webhookLimiter, checkReplayAttack } from "../utils/paymob-security.js";

const router = Router();

router.post("/vodafone-cash", webhookLimiter, async (req, res, next) => {
  try {
    const provider = PaymentFactory.getProvider("vodafone_cash");
    const signature = req.query.hmac || req.body?.hmac;
    const payload = req.body?.obj ? req.body : { obj: req.body };

    const result = await provider.handleWebhook(payload, signature);
    if (!result.isValid) {
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    if (result.transactionId) {
      const replay = await checkReplayAttack(String(result.transactionId));
      if (replay?.isReplay) return res.json({ success: true, duplicate: true });
    }

    const processed = await processProviderWebhook({ provider: "vodafone_cash", result });
    return res.json({ success: true, ...processed });
  } catch (error) {
    next(error);
  }
});

export default router;
