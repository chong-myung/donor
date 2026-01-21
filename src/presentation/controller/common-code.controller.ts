import { Controller, Get, Param, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { CommonCodeService } from '../../application/service/common-code.service';

@ApiExcludeController()
@ApiTags('Common')
@Controller('common')
export class CommonCodeController {
    constructor(private readonly commonCodeService: CommonCodeService) { }

    @Get('codes/:groupCode')
    @ApiBearerAuth()
    @ApiOperation({ summary: '그룹 코드별 공통 코드 목록 조회' })
    @ApiParam({ name: 'groupCode', description: '조회할 그룹 코드 (예: NATION_CODE)', example: 'NATION_CODE' })
    async getCodesByGroup(@Param('groupCode') groupCode: string, @Res() res: Response) {
        const codes = await this.commonCodeService.getCodesByGroup(groupCode);
        res.status(HttpStatus.OK).json({
            success: true,
            data: codes,
        });
    }
}
