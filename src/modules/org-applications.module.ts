import { Module } from '@nestjs/common';
import { OrgApplicationController } from '../presentation/controller/org-application.controller';
import { OrgApplicationService } from '../application/service/org-application.service';
import { OrgApplicationRepository } from '../infrastructure/persistence/adapter/org-application.repository';
import { OrgMemberRepository } from '../infrastructure/persistence/adapter/org-member.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';
import { OrganizationsModule } from './organizations.module';

@Module({
    imports: [PrismaModule, OrganizationsModule],
    controllers: [OrgApplicationController],
    providers: [
        OrgApplicationService,
        {
            provide: 'IOrgApplicationsRepository',
            useClass: OrgApplicationRepository,
        },
        {
            provide: 'IOrgMembersRepository',
            useClass: OrgMemberRepository,
        },
    ],
    exports: [OrgApplicationService, 'IOrgMembersRepository'],
})
export class OrgApplicationsModule {}
