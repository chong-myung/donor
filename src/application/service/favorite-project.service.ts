import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IFavoriteProjectsService } from './favorite-projects.service.interface';
import { IFavoriteProjectsRepository } from '../../domain/repository/favorite-projects.repository.interface';
import { FavoriteProjectEntity } from '../../domain/entity/favorite-project.entity';
import { CreateFavoriteProjectDTO } from '../dto/favorite-project.dto';

@Injectable()
export class FavoriteProjectService implements IFavoriteProjectsService {
    constructor(
        @Inject('IFavoriteProjectsRepository')
        private readonly favoriteRepository: IFavoriteProjectsRepository,
    ) {}

    async getFavoritesByUser(userId: number): Promise<FavoriteProjectEntity[]> {
        return this.favoriteRepository.findByUser(userId);
    }

    async addFavorite(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity> {
        const exists = await this.favoriteRepository.exists(data.userId, data.projectId);
        if (exists) {
            throw new ConflictException('Already favorited');
        }
        return this.favoriteRepository.create(data);
    }

    async removeFavorite(userId: number, projectId: number): Promise<void> {
        const deleted = await this.favoriteRepository.delete(userId, projectId);
        if (!deleted) {
            throw new NotFoundException('Favorite not found');
        }
    }

    async isFavorite(userId: number, projectId: number): Promise<boolean> {
        return this.favoriteRepository.exists(userId, projectId);
    }
}
