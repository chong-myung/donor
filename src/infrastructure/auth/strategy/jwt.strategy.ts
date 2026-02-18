
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../../crypto/crypto.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
    ) {
        super({
            jwtFromRequest: (req) => {
                // Extract token from Auth Header
                const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
                if (!token) return null;

                try {
                    // Decrypt the token
                    return this.cryptoService.decrypt(token);
                } catch (e) {
                    // If decryption fails, it might be an invalid token or not encrypted
                    // Return null or throw error
                    return null;
                }
            },
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
        });
    }

    // 토큰 검증이 성공했을 때만 호출됩니다.
    async validate(payload: any) {
        if (!payload.sub) {
            throw new UnauthorizedException('유효하지 않은 페이로드입니다.');
        }
        return { userId: payload.sub, email: payload.email, role: payload.role ?? 'DONOR' };
    }
}
