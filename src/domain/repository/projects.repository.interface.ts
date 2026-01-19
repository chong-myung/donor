import { ProjectEntity } from '../entity/project.entity';
import { CreateProjectDTO, UpdateProjectDTO, ProjectFilterDTO } from '../../application/dto/project.dto';

export interface IProjectsRepository {
  findAll(filter?: ProjectFilterDTO): Promise<ProjectEntity[]>;
  findById(id: number): Promise<ProjectEntity | null>;
  findByOrganization(orgId: number): Promise<ProjectEntity[]>;
  findByStatus(status: string): Promise<ProjectEntity[]>;
  create(data: CreateProjectDTO): Promise<ProjectEntity>;
  update(id: number, data: UpdateProjectDTO): Promise<ProjectEntity | null>;
  updateRaisedAmount(projectId: number, amount: string): Promise<void>;
  delete(id: number): Promise<boolean>;
}