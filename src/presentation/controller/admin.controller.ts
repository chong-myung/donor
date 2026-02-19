import { Controller, Get, Patch, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { toOrganizationList, toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList } from '../../application/dto/donation.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

    @Get('organizations')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 리스트 (상태별)' })
    async getOrganizations(@Query('status') status: string, @Res() res: Response) {
        const orgs = await this.organizationService.getAllOrganizations();
        const filtered = status ? orgs.filter(o => o.status === status) : orgs;
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationList(filtered) });
    }

    @Patch('organizations/:id/approve')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 승인' })
    async approveOrganization(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.updateOrganization(Number(id), { status: 'APPROVED' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(org) });
    }

    @Patch('organizations/:id/suspend')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 정지' })
    async suspendOrganization(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.updateOrganization(Number(id), { status: 'SUSPENDED' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(org) });
    }

    @Get('donations')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '전체 기부 내역' })
    async getAllDonations(@Res() res: Response) {
        const donations = await this.donationService.getAllDonations();
        res.status(HttpStatus.OK).json({ success: true, data: toDonationList(donations) });
    }

    @Get('settlements')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '정산 현황 (Mock)' })
    async getSettlements(@Res() res: Response) {
        res.status(HttpStatus.OK).json({ success: true, data: { message: 'Settlement data (mock)' } });
    }

    @Get('revenue')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '플랫폼 수수료 현황 (Mock)' })
    async getRevenue(@Res() res: Response) {
        res.status(HttpStatus.OK).json({ success: true, data: { message: 'Revenue data (mock)' } });
    }
}
