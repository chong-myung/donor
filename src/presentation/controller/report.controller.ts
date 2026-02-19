import { Controller, Get, Post, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('')
export class ReportController {
    @Post('reports')
    @ApiBearerAuth()
    @ApiOperation({ summary: '신고 접수' })
    async createReport(
        @Body() data: { targetType: string; targetId: number; reason: string },
        @Res() res: Response,
    ) {
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: { message: 'Report submitted', ...data },
        });
    }

    @Get('admin/reports')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '신고 목록' })
    async getReports(@Res() res: Response) {
        res.status(HttpStatus.OK).json({ success: true, data: [] });
    }
}
