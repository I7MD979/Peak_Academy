/** Which payment providers are configured in this deployment. */
export function getPaymentProviderAvailability() {
  return {
    paymob: false,
    vodafone_cash: false,
    instapay: true
  };
}
