import { Injectable } from '@nestjs/common';
import { IPaymentService } from './payment.service.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class MockPaymentService implements IPaymentService {
    async createCheckout(amount: string, currency: string, projectId: number) {
        const orderId = randomUUID();
        return {
            checkoutUrl: `https://mock-alchemy-pay.example.com/checkout/${orderId}`,
            orderId,
        };
    }

    async verifyWebhook(payload: any, signature: string): Promise<boolean> {
        return true;
    }
}
