import { Module } from '@nestjs/common';
import { AdminController } from '../presentation/controller/admin.controller';
import { ReportController } from '../presentation/controller/report.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';

@Module({
    imports: [OrganizationsModule, DonationsModule],
    controllers: [AdminController, ReportController],
})
export class AdminModule {}
