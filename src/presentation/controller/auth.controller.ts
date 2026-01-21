import { Controller, Get, Post, Body, UseGuards, Res, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../../application/service/auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeController, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Get('google')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: '구글 Oauth2 로그인' })
    async googleLogin(): Promise<void> {
        // Initiates the Google OAuth2 flow
    }

    @ApiExcludeEndpoint()
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: '구글 Oauth2 로그인 콜백' })
    async googleLoginCallback(@Req() req, @Res() res): Promise<void> {
        // req.user is populated by GoogleStrategy
        const googleUser = req.user;

        // Find or create user in our DB
        const user = await this.authService.validateUser(googleUser);

        // Generate JWT
        const { access_token, refresh_token } = await this.authService.login(user);

        // Set Refresh Token as HttpOnly Cookie
        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            path: '/api/auth/refresh', // Global path so it's accessible by all endpoints (or restrict to /api/auth/refresh)
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            secure: false, // Set to true in production with HTTPS
        });

        // Redirect to backend endpoints for demonstration
        if (access_token) {
            res.redirect(`http://localhost:3000/api/auth/login/success/${access_token}`);
        } else {
            res.redirect('http://localhost:3000/api/auth/login/failure');
        }
    }

    @ApiExcludeEndpoint()
    @Get('login/success/:token')
    @ApiOperation({ summary: '로그인 성공 페이지' })
    loginSuccess(@Param('token') token: string) {
        return {
            message: 'Login Successful',
            token: token,
            instruction: 'Copy this token and use it in the "Authorize" button above to access protected endpoints.'
        };
    }

    @ApiExcludeEndpoint()
    @Get('login/failure')
    @ApiOperation({ summary: '로그인 실패 페이지' })
    loginFailure() {
        return {
            message: 'Login Failed',
            instruction: 'Please try again.'
        };
    }

    @Get('protected')
    @ApiExcludeEndpoint()
    @ApiOperation({ summary: '보호된 엔드포인트 테스트' })
    protectedResource(@Req() req) {
        return { message: 'JWT is working!', user: req.user };
    }

    @Public()
    @Post('refresh')
    @ApiOperation({ summary: '토큰 갱신' })
    async refresh(@Req() req, @Body() body: { refresh_token?: string }) {
        const refreshToken = req.cookies['refresh_token'] || body.refresh_token;

        if (!refreshToken) {
            throw new Error('Refresh token not found');
        }

        return this.authService.refresh(refreshToken);
    }
}