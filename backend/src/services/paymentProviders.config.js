/** Which payment providers are configured in this deployment. */
export function getPaymentProviderAvailability() {
  const paymobConfigured = Boolean(
    process.env.PAYMOB_API_KEY && Number(process.env.PAYMOB_INTEGRATION_ID_CARD)
  );
  const walletIntegrationId = Number(
    process.env.PAYMOB_INTEGRATION_ID_CASH ||
      process.env.PAYMOB_INTEGRATION_ID_WALLET ||
      process.env.PAYMOB_WALLET_INTEGRATION_ID
  );

  return {
    paymob: paymobConfigured,
    vodafone_cash:
      paymobConfigured && Boolean(walletIntegrationId) && Boolean(process.env.PAYMOB_PUBLIC_KEY),
    instapay: true
  };
}
