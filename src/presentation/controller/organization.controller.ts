import { Controller, Get, Post, Patch, Body, Param, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from '../../application/service/organization.service';
import {
    CreateOrganizationDTO,
    UpdateOrganizationDTO,
    UpdateWalletDTO,
    toOrganizationList,
    toOrganizationDetail,
} from '../../application/dto/organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 등록' })
    @ApiBody({ type: CreateOrganizationDTO })
    async createOrganization(@Body() data: CreateOrganizationDTO, @Res() res: Response) {
        const org = await this.organizationService.createOrganization(data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 리스트 (Plus 상단 우선)' })
    async getOrganizations(@Res() res: Response) {
        const orgs = await this.organizationService.getAllOrganizations();
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationList(orgs),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 상세' })
    async getOrganizationById(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.getOrganizationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }

    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 프로필 수정' })
    @ApiBody({ type: UpdateOrganizationDTO })
    async updateOrganization(
        @Param('id') id: string,
        @Body() data: UpdateOrganizationDTO,
        @Res() res: Response,
    ) {
        const org = await this.organizationService.updateOrganization(Number(id), data);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }

    @Patch(':id/wallet')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 지갑 등록/변경' })
    @ApiBody({ type: UpdateWalletDTO })
    async updateWallet(
        @Param('id') id: string,
        @Body() data: UpdateWalletDTO,
        @Res() res: Response,
    ) {
        const org = await this.organizationService.updateWallet(Number(id), data.walletAddress);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }
}
