import { Module } from '@nestjs/common';
import { OrganizationController } from '../presentation/controller/organization.controller';
import { OrganizationService } from '../application/service/organization.service';
import { OrganizationRepository } from '../infrastructure/persistence/adapter/organization.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OrganizationController],
    providers: [
        OrganizationService,
        {
            provide: 'IOrganizationsRepository',
            useClass: OrganizationRepository,
        },
    ],
    exports: [OrganizationService],
})
export class OrganizationsModule {}
