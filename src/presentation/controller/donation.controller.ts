import { Controller, Get, Post, Body, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DonationService } from '../../application/service/donation.service';
import { CreateDonationDTO, DonationFilterDTO, toDonationList, toDonationDetail } from '../../application/dto/donation.dto';

@ApiTags('Donations')
@Controller('donations')
export class DonationController {
    constructor(private readonly donationService: DonationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 생성' })
    @ApiBody({ type: CreateDonationDTO })
    async createDonation(@Body() data: CreateDonationDTO, @Res() res: Response) {
        const donation = await this.donationService.createDonation(data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: toDonationDetail(donation),
        });
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 내역 리스트' })
    async getDonations(@Query() filter: DonationFilterDTO, @Res() res: Response) {
        const donations = await this.donationService.getAllDonations(filter);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationList(donations),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 상세' })
    async getDonationById(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationDetail(donation),
        });
    }

    @Get(':id/certificate')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 증명서 데이터' })
    async getCertificate(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        const detail = toDonationDetail(donation);

        res.status(HttpStatus.OK).json({
            success: true,
            data: {
                ...detail,
                certificateId: `CERT-${donation.donationId}`,
                issuedAt: new Date().toISOString(),
            },
        });
    }

    @Get('user/:userId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '사용자별 기부 내역' })
    async getDonationsByUser(@Param('userId') userId: string, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByUser(Number(userId));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationList(donations),
        });
    }

    @Get('project/:projectId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '프로젝트별 기부 내역' })
    async getDonationsByProject(@Param('projectId') projectId: string, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByProject(Number(projectId));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationList(donations),
        });
    }
}
