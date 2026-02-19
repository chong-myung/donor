import { Controller, Get, Patch, Param, Query, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { OrgApplicationService } from '../../application/service/org-application.service';
import { toOrganizationList, toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList } from '../../application/dto/donation.dto';
import {
    RejectOrgApplicationDTO,
    toOrgApplicationList,
    toOrgApplicationDetail,
} from '../../application/dto/org-application.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
        private readonly orgApplicationService: OrgApplicationService,
    ) {}

    // ── 입점 신청 심사 ──

    @Get('applications')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 목록' })
    async getApplications(@Query('status') status: string, @Res() res: Response) {
        const apps = await this.orgApplicationService.getAllApplications(status || undefined);
        res.status(HttpStatus.OK).json({ success: true, data: toOrgApplicationList(apps) });
    }

    @Get('applications/:id')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 상세' })
    async getApplicationDetail(@Param('id') id: string, @Res() res: Response) {
        const app = await this.orgApplicationService.getApplicationById(Number(id));
        res.status(HttpStatus.OK).json({ success: true, data: toOrgApplicationDetail(app) });
    }

    @Patch('applications/:id/approve')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 승인 → 기관 + 멤버 자동 생성' })
    async approveApplication(@Param('id') id: string, @Res() res: Response) {
        const { application, organization } = await this.orgApplicationService.approveApplication(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: {
                application: toOrgApplicationDetail(application),
                organization: toOrganizationDetail(organization),
            },
        });
    }

    @Patch('applications/:id/reject')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 반려' })
    @ApiBody({ type: RejectOrgApplicationDTO })
    async rejectApplication(
        @Param('id') id: string,
        @Body() data: RejectOrgApplicationDTO,
        @Res() res: Response,
    ) {
        const app = await this.orgApplicationService.rejectApplication(Number(id), data.rejectedReason);
        res.status(HttpStatus.OK).json({ success: true, data: toOrgApplicationDetail(app) });
    }

    // ── 기존 기관 관리 ──

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
