import { Controller, Get, UseGuards, Res, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../../application/service/auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
@ApiExcludeController()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Get('google')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: '구글 Oauth2 로그인' })
    async googleLogin(): Promise<void> {
        // Initiates the Google OAuth2 flow
    }

    @Public()
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: '구글 Oauth2 로그인 콜백' })
    async googleLoginCallback(@Req() req, @Res() res): Promise<void> {
        // req.user is populated by GoogleStrategy
        const googleUser = req.user;

        // Find or create user in our DB
        const user = await this.authService.validateUser(googleUser);

        // Generate JWT
        const { access_token } = await this.authService.login(user);

        // Redirect to backend endpoints for demonstration
        if (access_token) {
            res.redirect(`http://localhost:3000/api/auth/login/success/${access_token}`);
        } else {
            res.redirect('http://localhost:3000/api/auth/login/failure');
        }
    }

    @Public()
    @Get('login/success/:token')
    @ApiOperation({ summary: '로그인 성공 페이지' })
    loginSuccess(@Param('token') token: string) {
        return {
            message: 'Login Successful',
            token: token,
            instruction: 'Copy this token and use it in the "Authorize" button above to access protected endpoints.'
        };
    }

    @Public()
    @Get('login/failure')
    @ApiOperation({ summary: '로그인 실패 페이지' })
    loginFailure() {
        return {
            message: 'Login Failed',
            instruction: 'Please try again.'
        };
    }

    @Get('protected')
    @ApiBearerAuth()
    @ApiOperation({ summary: '보호된 엔드포인트 테스트' })
    protectedResource(@Req() req) {
        return { message: 'JWT is working!', user: req.user };
    }
}