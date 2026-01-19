import { ProjectEntity } from '../../domain/entity/project.entity';
import { CreateProjectDTO, UpdateProjectDTO, ProjectFilterDTO } from '../dto/project.dto';

export interface IProjectsService {
  getAllProjects(filter?: ProjectFilterDTO): Promise<ProjectEntity[]>;
  getProjectById(id: number): Promise<ProjectEntity>;
  getProjectsByOrganization(orgId: number): Promise<ProjectEntity[]>;
  getProjectsByStatus(status: string): Promise<ProjectEntity[]>;
  createProject(data: CreateProjectDTO): Promise<ProjectEntity>;
  updateProject(id: number, data: UpdateProjectDTO): Promise<ProjectEntity>;
  deleteProject(id: number): Promise<void>;
}