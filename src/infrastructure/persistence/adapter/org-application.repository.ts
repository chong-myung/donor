import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IOrgApplicationsRepository } from '../../../domain/repository/org-application.repository.interface';
import { OrgApplicationEntity } from '../../../domain/entity/org-application.entity';

@Injectable()
export class OrgApplicationRepository implements IOrgApplicationsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(status?: string): Promise<OrgApplicationEntity[]> {
        const where = status ? { status } : {};
        const apps = await this.prisma.orgApplication.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return apps.map(this.mapToEntity);
    }

    async findById(id: number): Promise<OrgApplicationEntity | null> {
        const app = await this.prisma.orgApplication.findUnique({
            where: { applicationId: id },
        });
        return app ? this.mapToEntity(app) : null;
    }

    async findByUserId(userId: number): Promise<OrgApplicationEntity[]> {
        const apps = await this.prisma.orgApplication.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return apps.map(this.mapToEntity);
    }

    async create(data: {
        userId: number;
        orgName: string;
        registrationNumber?: string | null;
        registrationDocUrl?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactEmail?: string | null;
        description?: string | null;
    }): Promise<OrgApplicationEntity> {
        const app = await this.prisma.orgApplication.create({ data });
        return this.mapToEntity(app);
    }

    async updateStatus(id: number, data: {
        status: string;
        rejectedReason?: string | null;
        reviewedAt?: Date;
    }): Promise<OrgApplicationEntity | null> {
        try {
            const app = await this.prisma.orgApplication.update({
                where: { applicationId: id },
                data,
            });
            return this.mapToEntity(app);
        } catch {
            return null;
        }
    }

    private mapToEntity(data: any): OrgApplicationEntity {
        return OrgApplicationEntity.create({
            applicationId: data.applicationId,
            userId: data.userId,
            orgName: data.orgName,
            registrationNumber: data.registrationNumber,
            registrationDocUrl: data.registrationDocUrl,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,
            description: data.description,
            status: data.status,
            rejectedReason: data.rejectedReason,
            reviewedAt: data.reviewedAt,
            createdAt: data.createdAt,
        });
    }
}
