import { FavoriteProjectEntity } from '../../domain/entity/favorite-project.entity';
import { CreateFavoriteProjectDTO } from '../dto/favorite-project.dto';

export interface IFavoriteProjectsService {
  getFavoritesByUser(userId: number): Promise<FavoriteProjectEntity[]>;
  addFavorite(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity>;
  removeFavorite(userId: number, projectId: number): Promise<void>;
  isFavorite(userId: number, projectId: number): Promise<boolean>;
}