import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto/organization.dto';

export interface IOrganizationsService {
  getAllOrganizations(): Promise<OrganizationEntity[]>;
  getOrganizationById(id: number): Promise<OrganizationEntity>;
  createOrganization(data: CreateOrganizationDTO): Promise<OrganizationEntity>;
  updateOrganization(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity>;
  deleteOrganization(id: number): Promise<void>;
}
