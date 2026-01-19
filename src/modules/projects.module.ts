import { Module } from '@nestjs/common';
import { ProjectController } from '../presentation/controller/project.controller';
import { ProjectService } from '../application/service/project.service';
import { ProjectRepository } from '../infrastructure/persistence/adapter/project.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ProjectController],
    providers: [
        ProjectService,
        {
            provide: 'IProjectsRepository',
            useClass: ProjectRepository,
        },
    ],
    exports: [ProjectService],
})
export class ProjectsModule { }
