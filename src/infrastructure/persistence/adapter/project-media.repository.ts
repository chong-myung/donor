import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IProjectMediaRepository } from '../../../domain/repository/project-media.repository.interface';
import { ProjectMediaEntity } from '../../../domain/entity/project-media.entity';
import { CreateProjectMediaDTO, UpdateProjectMediaDTO } from '../../../application/dto/project-media.dto';

@Injectable()
export class ProjectMediaRepository implements IProjectMediaRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<ProjectMediaEntity[]> {
        const media = await this.prisma.projectMedia.findMany();
        return media.map(this.mapToEntity);
    }

    async findById(id: number): Promise<ProjectMediaEntity | null> {
        const media = await this.prisma.projectMedia.findUnique({
            where: { mediaId: id },
        });
        return media ? this.mapToEntity(media) : null;
    }

    async findByProject(projectId: number): Promise<ProjectMediaEntity[]> {
        const media = await this.prisma.projectMedia.findMany({
            where: { projectId },
        });
        return media.map(this.mapToEntity);
    }

    async findByProjectAndContentType(projectId: number, contentType: string): Promise<ProjectMediaEntity[]> {
        const media = await this.prisma.projectMedia.findMany({
            where: { projectId, contentType },
        });
        return media.map(this.mapToEntity);
    }

    async create(data: CreateProjectMediaDTO): Promise<ProjectMediaEntity> {
        const media = await this.prisma.projectMedia.create({
            data: {
                projectId: data.projectId,
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType,
                contentType: data.contentType,
                description: data.description,
            },
        });
        return this.mapToEntity(media);
    }

    async update(id: number, data: UpdateProjectMediaDTO): Promise<ProjectMediaEntity | null> {
        try {
            const media = await this.prisma.projectMedia.update({
                where: { mediaId: id },
                data: {
                    mediaUrl: data.mediaUrl,
                    mediaType: data.mediaType,
                    contentType: data.contentType,
                    description: data.description,
                },
            });
            return this.mapToEntity(media);
        } catch (error) {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.projectMedia.delete({
                where: { mediaId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapToEntity(data: any): ProjectMediaEntity {
        return ProjectMediaEntity.create({
            mediaId: data.mediaId,
            projectId: data.projectId,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            contentType: data.contentType,
            description: data.description,
            uploadedAt: data.uploadedAt,
        });
    }
}
