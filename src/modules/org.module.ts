import { Module } from '@nestjs/common';
import { OrgController } from '../presentation/controller/org.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';

@Module({
    imports: [OrganizationsModule, DonationsModule],
    controllers: [OrgController],
})
export class OrgModule {}
