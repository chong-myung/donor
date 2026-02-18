import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../service/user.service'; // Adjust import path
import { UserEntity } from '@/domain/entity/user.entity';

import { CryptoService } from '../../infrastructure/crypto/crypto.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UserService,
        private jwtService: JwtService,
        private cryptoService: CryptoService,
    ) { }

    // In-memory refresh token storage (userId -> refreshToken)
    // TODO: Replace with database or distributed cache


    async validateUser(details: { email: string; firstName: string; lastName: string; picture: string }): Promise<any> {
        const user = await this.usersService.findUserByEmail(details.email);
        if (user) return user;

        // Create new user if not exists
        return this.usersService.createUser({
            email: details.email,
            loginPlatform: 'google',
            passwordHash: null,
            walletAddress: null, // Optional
            isActive: true,
        });
    }

    async login(user: UserEntity) {
        const payload = { email: user.email, sub: user.userId, role: (user as any).role ?? 'DONOR' };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); // Refresh token with longer expiry

        const encryptedAccessToken = this.cryptoService.encrypt(accessToken);
        const encryptedRefreshToken = this.cryptoService.encrypt(refreshToken);

        this.usersService.setUserRefreshToken(user.userId, encryptedRefreshToken);

        return {
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
        };
    }

    async refresh(encryptedRefreshToken: string) {
        let decryptedToken: string;
        try {
            decryptedToken = this.cryptoService.decrypt(encryptedRefreshToken);
        } catch (e) {
            throw new ForbiddenException('Invalid refresh token format');
        }

        let payload;
        try {
            payload = this.jwtService.verify(decryptedToken);
        } catch (e) {
            throw new ForbiddenException('Invalid or expired refresh token');
        }

        const userId = payload.sub;
        const currentRefreshToken = await this.usersService.getUserRefreshToken(userId);

        if (currentRefreshToken !== encryptedRefreshToken) {
            throw new ForbiddenException('Invalid refresh token');
        }

        const user = await this.usersService.findUserById(userId);
        if (!user) {
            throw new ForbiddenException('User not found');
        }

        // Generate new tokens (rotate refresh token)
        return this.login(user);
    }
}
