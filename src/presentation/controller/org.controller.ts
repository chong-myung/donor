import { Controller, Get, Post, Param, Query, Req, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgMemberGuard } from '../../infrastructure/auth/guard/org-member.guard';
import { OrgRoles } from '../../common/decorators/org-roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList, toDonationDetail } from '../../application/dto/donation.dto';

@ApiTags('Organization My Page')
@Controller('org')
@UseGuards(OrgMemberGuard)
export class OrgController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

    @Get('dashboard')
    @ApiBearerAuth()
    @OrgRoles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: '기관 대시보드' })
    async getDashboard(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const org = await this.organizationService.getOrganizationById(orgId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: {
                organization: toOrganizationDetail(org),
                planType: org.planType,
            },
        });
    }

    @Get('donations')
    @ApiBearerAuth()
    @OrgRoles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: '기부 수령 내역' })
    async getOrgDonations(@Req() req: Request, @Res() res: Response) {
        const donations = await this.donationService.getAllDonations();
        res.status(HttpStatus.OK).json({ success: true, data: toDonationList(donations) });
    }

    @Get('donations/:id')
    @ApiBearerAuth()
    @OrgRoles('ADMIN', 'MANAGER', 'VIEWER')
    @ApiOperation({ summary: '기부 수령 상세' })
    async getOrgDonationDetail(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        res.status(HttpStatus.OK).json({ success: true, data: toDonationDetail(donation) });
    }

    @Get('plan')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: '현재 플랜 정보' })
    async getPlan(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const org = await this.organizationService.getOrganizationById(orgId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: { planType: org.planType, status: org.status },
        });
    }

    @Post('plan/upgrade')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: 'Plus 구독 (Mock)' })
    async upgradePlan(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const updated = await this.organizationService.updateOrganization(orgId, { planType: 'PLUS' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(updated) });
    }

    @Post('plan/cancel')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: '구독 해지' })
    async cancelPlan(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const updated = await this.organizationService.updateOrganization(orgId, { planType: 'FREE' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(updated) });
    }

    @Get('reports')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: '기부 리포트 (Plus 전용)' })
    async getReports(@Req() req: Request, @Query() query: { startDate?: string; endDate?: string }, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const org = await this.organizationService.getOrganizationById(orgId);
        if (!org.isPlusPlan()) {
            res.status(HttpStatus.FORBIDDEN).json({ success: false, error: 'Plus plan required' });
            return;
        }
        res.status(HttpStatus.OK).json({ success: true, data: { message: 'Report data (mock)', planType: 'PLUS' } });
    }
}
