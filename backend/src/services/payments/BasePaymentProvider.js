export class BasePaymentProvider {
  /**
   * @param {Object} params
   * @param {number} params.amount - Amount in EGP piasters (amount * 100)
   * @param {string} params.orderId - Internal order ID
   * @param {string} params.userId - User ID
   * @param {Object} params.customer - { name, email, phone }
   * @param {Object} params.metadata - Extra data
   */
  async createOrder(_params) {
    throw new Error("createOrder() must be implemented");
  }

  /**
   * @param {Object} payload
   * @param {string} signature
   */
  async handleWebhook(_payload, _signature) {
    throw new Error("handleWebhook() must be implemented");
  }

  async refund(_transactionId, _amount) {
    throw new Error("refund() not supported by this provider");
  }

  async getTransactionStatus(_providerOrderId) {
    throw new Error("getTransactionStatus() must be implemented");
  }
}
