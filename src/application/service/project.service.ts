import { Injectable, Inject } from '@nestjs/common';
import { IProjectsService } from './projects.service.interface';
import { IProjectsRepository } from '../../domain/repository/projects.repository.interface';
import { ProjectEntity } from '../../domain/entity/project.entity';
import { CreateProjectDTO, UpdateProjectDTO, ProjectFilterDTO } from '../dto/project.dto';

@Injectable()
export class ProjectService implements IProjectsService {
    constructor(
        @Inject('IProjectsRepository') private readonly projectRepository: IProjectsRepository
    ) { }

    async getAllProjects(filter?: ProjectFilterDTO): Promise<ProjectEntity[]> {
        return this.projectRepository.findAll(filter);
    }

    async getProjectById(id: number): Promise<ProjectEntity> {
        const project = await this.projectRepository.findById(id);
        if (!project) {
            throw new Error('Project not found');
        }
        return project;
    }

    async getProjectsByOrganization(orgId: number): Promise<ProjectEntity[]> {
        return this.projectRepository.findByOrganization(orgId);
    }

    async getProjectsByStatus(status: string): Promise<ProjectEntity[]> {
        return this.projectRepository.findByStatus(status);
    }

    async createProject(data: CreateProjectDTO): Promise<ProjectEntity> {
        return this.projectRepository.create(data);
    }

    async updateProject(id: number, data: UpdateProjectDTO): Promise<ProjectEntity> {
        const updated = await this.projectRepository.update(id, data);
        if (!updated) {
            throw new Error('Project not found or update failed');
        }
        return updated;
    }

    async deleteProject(id: number): Promise<void> {
        const deleted = await this.projectRepository.delete(id);
        if (!deleted) {
            throw new Error('Project not found or delete failed');
        }
    }
}
