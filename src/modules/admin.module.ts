import { Module } from '@nestjs/common';
import { AdminController } from '../presentation/controller/admin.controller';
import { ReportController } from '../presentation/controller/report.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';
import { OrgApplicationsModule } from './org-applications.module';

@Module({
    imports: [OrganizationsModule, DonationsModule, OrgApplicationsModule],
    controllers: [AdminController, ReportController],
})
export class AdminModule {}
