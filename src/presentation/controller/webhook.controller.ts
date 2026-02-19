import { Controller, Post, Body, HttpStatus, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { DonationService } from '../../application/service/donation.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    constructor(private readonly donationService: DonationService) {}

    @Post('alchemy-pay')
    @Public()
    @ApiOperation({ summary: 'Alchemy Pay 결제 웹훅 (Mock)' })
    async handleAlchemyPayWebhook(
        @Body() payload: { orderId: string; donationId: number; status: string },
        @Headers('x-signature') signature: string,
        @Res() res: Response,
    ) {
        if (payload.status === 'Paid') {
            await this.donationService.updateDonation(payload.donationId, { status: 'Confirmed' });
        } else if (payload.status === 'Failed' || payload.status === 'Expired') {
            await this.donationService.updateDonation(payload.donationId, { status: 'Failed' });
        }

        res.status(HttpStatus.OK).json({ success: true });
    }
}
