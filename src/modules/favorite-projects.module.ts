import { Module } from '@nestjs/common';
import { FavoriteProjectService } from '../application/service/favorite-project.service';
import { FavoriteProjectRepository } from '../infrastructure/persistence/adapter/favorite-project.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        FavoriteProjectService,
        {
            provide: 'IFavoriteProjectsRepository',
            useClass: FavoriteProjectRepository,
        },
    ],
    exports: [FavoriteProjectService],
})
export class FavoriteProjectsModule {}
