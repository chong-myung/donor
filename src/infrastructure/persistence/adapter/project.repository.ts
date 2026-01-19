import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IProjectsRepository } from '../../../domain/repository/projects.repository.interface';
import { ProjectFilterDTO, CreateProjectDTO, UpdateProjectDTO } from '@/application/dto/project.dto';
import { ProjectEntity } from '@/domain/entity/project.entity';

@Injectable()
export class ProjectRepository implements IProjectsRepository {
    constructor(private prisma: PrismaService) { }

    findAll(filter?: ProjectFilterDTO): Promise<ProjectEntity[]> {
        throw new Error('Method not implemented.');
    }
    findById(id: number): Promise<ProjectEntity | null> {
        throw new Error('Method not implemented.');
    }
    findByOrganization(orgId: number): Promise<ProjectEntity[]> {
        throw new Error('Method not implemented.');
    }
    findByStatus(status: string): Promise<ProjectEntity[]> {
        throw new Error('Method not implemented.');
    }
    create(data: CreateProjectDTO): Promise<ProjectEntity> {
        throw new Error('Method not implemented.');
    }
    update(id: number, data: UpdateProjectDTO): Promise<ProjectEntity | null> {
        throw new Error('Method not implemented.');
    }
    updateRaisedAmount(projectId: number, amount: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    delete(id: number): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

}