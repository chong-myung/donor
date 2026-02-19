import { Module } from '@nestjs/common';
import { ProjectMediaService } from '../application/service/project-media.service';
import { ProjectMediaRepository } from '../infrastructure/persistence/adapter/project-media.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        ProjectMediaService,
        {
            provide: 'IProjectMediaRepository',
            useClass: ProjectMediaRepository,
        },
    ],
    exports: [ProjectMediaService],
})
export class ProjectMediaModule {}
