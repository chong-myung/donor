import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProjectMediaService } from './project-media.service.interface';
import { IProjectMediaRepository } from '../../domain/repository/project-media.repository.interface';
import { ProjectMediaEntity } from '../../domain/entity/project-media.entity';
import { CreateProjectMediaDTO, UpdateProjectMediaDTO } from '../dto/project-media.dto';

@Injectable()
export class ProjectMediaService implements IProjectMediaService {
    constructor(
        @Inject('IProjectMediaRepository')
        private readonly mediaRepository: IProjectMediaRepository,
    ) {}

    async getAllMedia(): Promise<ProjectMediaEntity[]> {
        return this.mediaRepository.findAll();
    }

    async getMediaById(id: number): Promise<ProjectMediaEntity> {
        const media = await this.mediaRepository.findById(id);
        if (!media) {
            throw new NotFoundException('Media not found');
        }
        return media;
    }

    async getMediaByProject(projectId: number): Promise<ProjectMediaEntity[]> {
        return this.mediaRepository.findByProject(projectId);
    }

    async createMedia(data: CreateProjectMediaDTO): Promise<ProjectMediaEntity> {
        return this.mediaRepository.create(data);
    }

    async updateMedia(id: number, data: UpdateProjectMediaDTO): Promise<ProjectMediaEntity> {
        const updated = await this.mediaRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Media not found or update failed');
        }
        return updated;
    }

    async deleteMedia(id: number): Promise<void> {
        const deleted = await this.mediaRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Media not found or delete failed');
        }
    }
}
