import { OrganizationEntity } from '../entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../../application/dto/organization.dto';

export interface IOrganizationsRepository {
  findAll(): Promise<OrganizationEntity[]>;
  findById(id: number): Promise<OrganizationEntity | null>;
  findByUserId(userId: number): Promise<OrganizationEntity | null>;
  findByWalletAddress(walletAddress: string): Promise<OrganizationEntity | null>;
  create(data: CreateOrganizationDTO): Promise<OrganizationEntity>;
  update(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity | null>;
  delete(id: number): Promise<boolean>;
}
