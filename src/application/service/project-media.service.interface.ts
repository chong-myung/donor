import { ProjectMediaEntity } from '../../domain/entity/project-media.entity';
import { CreateProjectMediaDTO, UpdateProjectMediaDTO } from '../dto/project-media.dto';

export interface IProjectMediaService {
  getAllMedia(): Promise<ProjectMediaEntity[]>;
  getMediaById(id: number): Promise<ProjectMediaEntity>;
  getMediaByProject(projectId: number): Promise<ProjectMediaEntity[]>;
  createMedia(data: CreateProjectMediaDTO): Promise<ProjectMediaEntity>;
  updateMedia(id: number, data: UpdateProjectMediaDTO): Promise<ProjectMediaEntity>;
  deleteMedia(id: number): Promise<void>;
}