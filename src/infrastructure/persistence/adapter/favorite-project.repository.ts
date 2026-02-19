import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IFavoriteProjectsRepository } from '../../../domain/repository/favorite-projects.repository.interface';
import { FavoriteProjectEntity } from '../../../domain/entity/favorite-project.entity';
import { CreateFavoriteProjectDTO, FavoriteProjectFilterDTO } from '../../../application/dto/favorite-project.dto';
import { ProjectEntity } from '../../../domain/entity/project.entity';

@Injectable()
export class FavoriteProjectRepository implements IFavoriteProjectsRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(filter?: FavoriteProjectFilterDTO): Promise<FavoriteProjectEntity[]> {
        const where: any = {};
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.projectId) where.projectId = filter.projectId;

        const favorites = await this.prisma.favoriteProject.findMany({
            where,
            include: { project: true },
        });
        return favorites.map(this.mapToEntity);
    }

    async findByUser(userId: number): Promise<FavoriteProjectEntity[]> {
        const favorites = await this.prisma.favoriteProject.findMany({
            where: { userId },
            include: { project: true },
            orderBy: { favoritedAt: 'desc' },
        });
        return favorites.map(this.mapToEntity);
    }

    async findByUserAndProject(userId: number, projectId: number): Promise<FavoriteProjectEntity | null> {
        const favorite = await this.prisma.favoriteProject.findUnique({
            where: { userId_projectId: { userId, projectId } },
            include: { project: true },
        });
        return favorite ? this.mapToEntity(favorite) : null;
    }

    async create(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity> {
        const favorite = await this.prisma.favoriteProject.create({
            data: {
                userId: data.userId,
                projectId: data.projectId,
            },
            include: { project: true },
        });
        return this.mapToEntity(favorite);
    }

    async delete(userId: number, projectId: number): Promise<boolean> {
        try {
            await this.prisma.favoriteProject.delete({
                where: { userId_projectId: { userId, projectId } },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async exists(userId: number, projectId: number): Promise<boolean> {
        const count = await this.prisma.favoriteProject.count({
            where: { userId, projectId },
        });
        return count > 0;
    }

    private mapToEntity(data: any): FavoriteProjectEntity {
        return FavoriteProjectEntity.create({
            userId: data.userId,
            projectId: data.projectId,
            favoritedAt: data.favoritedAt,
            project: data.project
                ? ProjectEntity.create({
                    projectId: data.project.projectId,
                    orgId: data.project.orgId,
                    beneficiaryId: data.project.beneficiaryId,
                    nation: data.project.nation,
                    title: data.project.title,
                    thumbnailUrl: data.project.thumbnailUrl,
                    shortDescription: data.project.shortDescription,
                    detailedDescription: data.project.detailedDescription,
                    goalAmount: data.project.goalAmount?.toString() ?? null,
                    currentRaisedUsdc: data.project.currentRaisedUsdc?.toString() ?? '0.00',
                    status: data.project.status,
                    startDate: data.project.startDate,
                })
                : undefined,
        });
    }
}
