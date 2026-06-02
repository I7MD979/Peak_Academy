import crypto from "crypto";

const stringifyHmacValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

/** Paymob concatenation order for transaction callback HMAC. */
export const buildPaymobHmacPayload = (obj = {}) => {
  const fields = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success
  ];
  return fields.map(stringifyHmacValue).join("");
};

export const verifyPaymobHmac = (obj, hmac) => {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !hmac || !obj) return false;
  const calculated = crypto.createHmac("sha512", secret).update(buildPaymobHmacPayload(obj)).digest("hex");
  return calculated === hmac;
};
