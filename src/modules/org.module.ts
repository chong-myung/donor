import { Module } from '@nestjs/common';
import { OrgController } from '../presentation/controller/org.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [OrganizationsModule, DonationsModule, PrismaModule],
    controllers: [OrgController],
})
export class OrgModule {}
