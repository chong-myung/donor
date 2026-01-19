import { FavoriteProjectEntity } from '../entity/favorite-project.entity';
import { CreateFavoriteProjectDTO, FavoriteProjectFilterDTO } from '../../application/dto/favorite-project.dto';

export interface IFavoriteProjectsRepository {
  findAll(filter?: FavoriteProjectFilterDTO): Promise<FavoriteProjectEntity[]>;
  findByUser(userId: number): Promise<FavoriteProjectEntity[]>;
  findByUserAndProject(userId: number, projectId: number): Promise<FavoriteProjectEntity | null>;
  create(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity>;
  delete(userId: number, projectId: number): Promise<boolean>;
  exists(userId: number, projectId: number): Promise<boolean>;
}