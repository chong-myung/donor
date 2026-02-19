import { Controller, Get, Post, Param, Body, Req, HttpStatus, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgApplicationService } from '../../application/service/org-application.service';
import {
    CreateOrgApplicationDTO,
    toOrgApplicationList,
    toOrgApplicationDetail,
} from '../../application/dto/org-application.dto';

@ApiTags('Org Applications')
@Controller('org-applications')
export class OrgApplicationController {
    constructor(private readonly orgApplicationService: OrgApplicationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 입점 신청' })
    @ApiBody({ type: CreateOrgApplicationDTO })
    async submitApplication(
        @Req() req: Request,
        @Body() data: CreateOrgApplicationDTO,
        @Res() res: Response,
    ) {
        const userId = (req as any).user.userId;
        const app = await this.orgApplicationService.submitApplication(userId, data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: toOrgApplicationDetail(app),
        });
    }

    @Get('my')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 입점 신청 내역' })
    async getMyApplications(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const apps = await this.orgApplicationService.getMyApplications(userId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrgApplicationList(apps),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '입점 신청 상세' })
    async getApplicationById(@Param('id') id: string, @Res() res: Response) {
        const app = await this.orgApplicationService.getApplicationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrgApplicationDetail(app),
        });
    }
}
