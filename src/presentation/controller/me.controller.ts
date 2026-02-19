import { Controller, Get, Post, Patch, Delete, Param, Body, Req, HttpStatus, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DonationService } from '../../application/service/donation.service';
import { FavoriteProjectService } from '../../application/service/favorite-project.service';
import { UserService } from '../../application/service/user.service';
import { toDonationList } from '../../application/dto/donation.dto';

@ApiTags('My Page')
@Controller('me')
export class MeController {
    constructor(
        private readonly donationService: DonationService,
        private readonly favoriteProjectService: FavoriteProjectService,
        private readonly userService: UserService,
    ) {}

    @Get('donations')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 기부 내역' })
    async getMyDonations(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const donations = await this.donationService.getDonationsByUser(userId);
        res.status(HttpStatus.OK).json({ success: true, data: toDonationList(donations) });
    }

    @Get('favorites')
    @ApiBearerAuth()
    @ApiOperation({ summary: '좋아요 캠페인 리스트' })
    async getMyFavorites(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const favorites = await this.favoriteProjectService.getFavoritesByUser(userId);
        res.status(HttpStatus.OK).json({ success: true, data: favorites.map(f => f.toJSON()) });
    }

    @Post('favorites/:projectId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '좋아요 추가' })
    async addFavorite(@Req() req: Request, @Param('projectId') projectId: string, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const favorite = await this.favoriteProjectService.addFavorite({ userId, projectId: Number(projectId) });
        res.status(HttpStatus.CREATED).json({ success: true, data: favorite.toJSON() });
    }

    @Delete('favorites/:projectId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '좋아요 삭제' })
    async removeFavorite(@Req() req: Request, @Param('projectId') projectId: string, @Res() res: Response) {
        const userId = (req as any).user.userId;
        await this.favoriteProjectService.removeFavorite(userId, Number(projectId));
        res.status(HttpStatus.OK).json({ success: true });
    }

    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 계정 정보' })
    async getMyProfile(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.info(userId);
        res.status(HttpStatus.OK).json({ success: true, data: user });
    }

    @Patch('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '계정 정보 수정' })
    async updateMyProfile(@Req() req: Request, @Body() data: { email?: string }, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.updateUser(userId, data);
        res.status(HttpStatus.OK).json({ success: true, data: user?.toPublicJSON() });
    }

    @Get('wallet')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 지갑 정보' })
    async getMyWallet(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.findUserById(userId);
        res.status(HttpStatus.OK).json({ success: true, data: { walletAddress: user?.walletAddress } });
    }

    @Patch('wallet')
    @ApiBearerAuth()
    @ApiOperation({ summary: '지갑 변경' })
    async updateMyWallet(@Req() req: Request, @Body() data: { walletAddress: string }, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.updateUser(userId, { walletAddress: data.walletAddress });
        res.status(HttpStatus.OK).json({ success: true, data: { walletAddress: user?.walletAddress } });
    }
}
