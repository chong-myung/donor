import { Injectable } from '@nestjs/common';
import { IBlockchainService } from './blockchain.service.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class MockBlockchainService implements IBlockchainService {
    async createTransaction(amount: string, orgWallet: string, platformWallet: string) {
        const total = parseFloat(amount);
        const orgAmount = (total * 0.95).toFixed(8);
        const platformFee = (total * 0.05).toFixed(8);

        return {
            transactionHash: `mock_tx_${randomUUID().replace(/-/g, '')}`,
            orgAmount,
            platformFee,
        };
    }
}
