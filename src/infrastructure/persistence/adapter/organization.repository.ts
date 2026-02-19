import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IOrganizationsRepository } from '../../../domain/repository/organizations.repository.interface';
import { OrganizationEntity } from '../../../domain/entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../../../application/dto/organization.dto';

@Injectable()
export class OrganizationRepository implements IOrganizationsRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<OrganizationEntity[]> {
        const orgs = await this.prisma.organization.findMany({
            orderBy: [
                { planType: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        return orgs.map(this.mapToEntity);
    }

    async findById(id: number): Promise<OrganizationEntity | null> {
        const org = await this.prisma.organization.findUnique({
            where: { orgId: id },
        });
        return org ? this.mapToEntity(org) : null;
    }

    async findByUserId(userId: number): Promise<OrganizationEntity | null> {
        const org = await this.prisma.organization.findUnique({
            where: { userId },
        });
        return org ? this.mapToEntity(org) : null;
    }

    async findByWalletAddress(walletAddress: string): Promise<OrganizationEntity | null> {
        const org = await this.prisma.organization.findUnique({
            where: { walletAddress },
        });
        return org ? this.mapToEntity(org) : null;
    }

    async create(data: CreateOrganizationDTO): Promise<OrganizationEntity> {
        const org = await this.prisma.organization.create({
            data: {
                name: data.name,
                registrationNumber: data.registrationNumber,
                walletAddress: data.walletAddress,
                contactInfo: data.contactInfo,
                userId: data.userId,
                planType: data.planType ?? 'FREE',
                status: data.status ?? 'PENDING',
            },
        });
        return this.mapToEntity(org);
    }

    async update(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity | null> {
        try {
            const org = await this.prisma.organization.update({
                where: { orgId: id },
                data: {
                    name: data.name,
                    registrationNumber: data.registrationNumber,
                    walletAddress: data.walletAddress,
                    contactInfo: data.contactInfo,
                    userId: data.userId,
                    planType: data.planType,
                    status: data.status,
                },
            });
            return this.mapToEntity(org);
        } catch (error) {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.organization.delete({
                where: { orgId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapToEntity(data: any): OrganizationEntity {
        return OrganizationEntity.create({
            orgId: data.orgId,
            name: data.name,
            registrationNumber: data.registrationNumber,
            walletAddress: data.walletAddress,
            contactInfo: data.contactInfo,
            userId: data.userId,
            planType: data.planType,
            status: data.status,
            createdAt: data.createdAt,
        });
    }
}
