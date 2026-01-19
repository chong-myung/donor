import { Module } from '@nestjs/common';
import { AuthService } from '../application/service/auth.service';
import { AuthController } from '../presentation/controller/auth.controller';
import { UsersModule } from './users.module'; // Import UsersModule
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleStrategy } from '../infrastructure/auth/strategy/google.strategy';
import { JwtStrategy } from '../infrastructure/auth/strategy/jwt.strategy';
import { CryptoService } from '../infrastructure/crypto/crypto.service';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'secretKey',
                signOptions: { expiresIn: '60m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, GoogleStrategy, JwtStrategy, CryptoService],
    exports: [AuthService],
})
export class AuthModule { }
