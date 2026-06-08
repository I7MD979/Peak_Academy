"use client";

import PaymentMethodSelector from "./PaymentMethodSelector";
import FawryDisplay from "./FawryDisplay";
import InstapayDisplay from "./InstapayDisplay";

export default function CheckoutPaymentStep({
  selectedProvider,
  onProviderChange,
  checkoutResult,
  amountCents
}) {
  if (!checkoutResult) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-bold text-auth-on-surface-variant">اختر طريقة الدفع</p>
        <PaymentMethodSelector selected={selectedProvider} onChange={onProviderChange} />
      </div>
    );
  }

  const { provider, referenceCode, ipaAlias, amountEGP, expiresAt, paymentId, instructions } =
    checkoutResult;

  return (
    <div className="space-y-4">
      {provider === "fawry" && referenceCode ? (
        <FawryDisplay
          referenceCode={referenceCode}
          expiresAt={expiresAt}
          amount={amountCents || parseFloat(amountEGP) * 100}
        />
      ) : null}

      {provider === "instapay" && referenceCode ? (
        <InstapayDisplay
          referenceCode={referenceCode}
          ipaAlias={ipaAlias}
          amountEGP={amountEGP}
          paymentId={paymentId}
        />
      ) : null}

      {instructions && provider !== "fawry" && provider !== "instapay" ? (
        <p className="rounded-lg bg-bg p-3 text-sm text-text-muted">{instructions}</p>
      ) : null}
    </div>
  );
}
