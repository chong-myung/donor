import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users.module';
import { ProjectsModule } from './modules/projects.module';
import { AuthModule } from './modules/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './infrastructure/auth/guard/jwt-auth.guard';
import { RolesGuard } from './infrastructure/auth/guard/roles.guard';
import { CommonCodeModule } from './modules/common-code.module';
import { OrganizationsModule } from './modules/organizations.module';
import { ProjectMediaModule } from './modules/project-media.module';
import { FavoriteProjectsModule } from './modules/favorite-projects.module';
import { DonationsModule } from './modules/donations.module';
import { MeModule } from './modules/me.module';
import { OrgModule } from './modules/org.module';
import { AdminModule } from './modules/admin.module';
import { OrgApplicationsModule } from './modules/org-applications.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        UsersModule,
        ProjectsModule,
        AuthModule,
        CommonCodeModule,
        OrganizationsModule,
        ProjectMediaModule,
        FavoriteProjectsModule,
        DonationsModule,
        MeModule,
        OrgModule,
        AdminModule,
        OrgApplicationsModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
    ],
})
export class AppModule { }
