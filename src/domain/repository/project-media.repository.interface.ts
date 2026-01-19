import { ProjectMediaEntity } from '../entity/project-media.entity';
import { CreateProjectMediaDTO, UpdateProjectMediaDTO } from '../../application/dto/project-media.dto';

export interface IProjectMediaRepository {
  findAll(): Promise<ProjectMediaEntity[]>;
  findById(id: number): Promise<ProjectMediaEntity | null>;
  findByProject(projectId: number): Promise<ProjectMediaEntity[]>;
  findByProjectAndContentType(projectId: number, contentType: string): Promise<ProjectMediaEntity[]>;
  create(data: CreateProjectMediaDTO): Promise<ProjectMediaEntity>;
  update(id: number, data: UpdateProjectMediaDTO): Promise<ProjectMediaEntity | null>;
  delete(id: number): Promise<boolean>;
}