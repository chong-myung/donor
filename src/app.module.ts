import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users.module';
import { ProjectsModule } from './modules/projects.module';
import { AuthModule } from './modules/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './infrastructure/auth/guard/jwt-auth.guard';
import { CommonCodeModule } from './modules/common-code.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        UsersModule,
        ProjectsModule,
        AuthModule,
        CommonCodeModule,
    ],
    controllers: [],
    providers: [{
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
    }],
})
export class AppModule { }
