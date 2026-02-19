export interface IPaymentService {
    createCheckout(amount: string, currency: string, projectId: number): Promise<{ checkoutUrl: string; orderId: string }>;
    verifyWebhook(payload: any, signature: string): Promise<boolean>;
}
