import { Module } from '@nestjs/common';
import { DonationController } from '../presentation/controller/donation.controller';
import { WebhookController } from '../presentation/controller/webhook.controller';
import { DonationService } from '../application/service/donation.service';
import { DonationRepository } from '../infrastructure/persistence/adapter/donation.repository';
import { MockPaymentService } from '../application/service/mock-payment.service';
import { MockBlockchainService } from '../application/service/mock-blockchain.service';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DonationController, WebhookController],
    providers: [
        DonationService,
        {
            provide: 'IDonationsRepository',
            useClass: DonationRepository,
        },
        {
            provide: 'IPaymentService',
            useClass: MockPaymentService,
        },
        {
            provide: 'IBlockchainService',
            useClass: MockBlockchainService,
        },
    ],
    exports: [DonationService],
})
export class DonationsModule {}
