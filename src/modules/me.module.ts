import { Module } from '@nestjs/common';
import { MeController } from '../presentation/controller/me.controller';
import { DonationsModule } from './donations.module';
import { FavoriteProjectsModule } from './favorite-projects.module';
import { UsersModule } from './users.module';

@Module({
    imports: [DonationsModule, FavoriteProjectsModule, UsersModule],
    controllers: [MeController],
})
export class MeModule {}
