import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationsService } from './organizations.service.interface';
import { IOrganizationsRepository } from '../../domain/repository/organizations.repository.interface';
import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto/organization.dto';

@Injectable()
export class OrganizationService implements IOrganizationsService {
    constructor(
        @Inject('IOrganizationsRepository')
        private readonly organizationRepository: IOrganizationsRepository,
    ) {}

    async getAllOrganizations(): Promise<OrganizationEntity[]> {
        return this.organizationRepository.findAll();
    }

    async getOrganizationById(id: number): Promise<OrganizationEntity> {
        const org = await this.organizationRepository.findById(id);
        if (!org) {
            throw new NotFoundException('Organization not found');
        }
        return org;
    }

    async createOrganization(data: CreateOrganizationDTO): Promise<OrganizationEntity> {
        return this.organizationRepository.create(data);
    }

    async updateOrganization(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity> {
        const updated = await this.organizationRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Organization not found or update failed');
        }
        return updated;
    }

    async deleteOrganization(id: number): Promise<void> {
        const deleted = await this.organizationRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Organization not found or delete failed');
        }
    }

    async getOrganizationByUserId(userId: number): Promise<OrganizationEntity> {
        const org = await this.organizationRepository.findByUserId(userId);
        if (!org) {
            throw new NotFoundException('Organization not found for this user');
        }
        return org;
    }

    async updateWallet(id: number, walletAddress: string): Promise<OrganizationEntity> {
        const updated = await this.organizationRepository.update(id, { walletAddress });
        if (!updated) {
            throw new NotFoundException('Organization not found');
        }
        return updated;
    }
}
