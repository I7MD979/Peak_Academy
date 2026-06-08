import { PaymobProvider } from "./PaymobProvider.js";
import { FawryProvider } from "./FawryProvider.js";
import { VodafoneCashProvider } from "./VodafoneCashProvider.js";
import { InstapayProvider } from "./InstapayProvider.js";

const PROVIDERS = {
  paymob: PaymobProvider,
  fawry: FawryProvider,
  vodafone_cash: VodafoneCashProvider,
  instapay: InstapayProvider
};

export class PaymentFactory {
  /**
   * @param {'paymob'|'fawry'|'vodafone_cash'|'instapay'} provider
   * @returns {import('./BasePaymentProvider.js').BasePaymentProvider}
   */
  static getProvider(provider) {
    const Provider = PROVIDERS[provider];
    if (!Provider) {
      throw new Error(`Unknown payment provider: ${provider}`);
    }
    return new Provider();
  }

  static getSupportedProviders() {
    return Object.keys(PROVIDERS);
  }
}
