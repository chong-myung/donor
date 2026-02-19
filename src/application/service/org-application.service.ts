import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { IOrgApplicationsRepository } from '../../domain/repository/org-application.repository.interface';
import { IOrgMembersRepository } from '../../domain/repository/org-member.repository.interface';
import { IOrganizationsRepository } from '../../domain/repository/organizations.repository.interface';
import { OrgApplicationEntity } from '../../domain/entity/org-application.entity';
import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrgApplicationDTO } from '../dto/org-application.dto';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class OrgApplicationService {
    constructor(
        @Inject('IOrgApplicationsRepository')
        private readonly appRepository: IOrgApplicationsRepository,
        @Inject('IOrgMembersRepository')
        private readonly memberRepository: IOrgMembersRepository,
        @Inject('IOrganizationsRepository')
        private readonly orgRepository: IOrganizationsRepository,
        private readonly prisma: PrismaService,
    ) {}

    async getAllApplications(status?: string): Promise<OrgApplicationEntity[]> {
        return this.appRepository.findAll(status);
    }

    async getApplicationById(id: number): Promise<OrgApplicationEntity> {
        const app = await this.appRepository.findById(id);
        if (!app) {
            throw new NotFoundException('Application not found');
        }
        return app;
    }

    async getMyApplications(userId: number): Promise<OrgApplicationEntity[]> {
        return this.appRepository.findByUserId(userId);
    }

    async submitApplication(userId: number, data: CreateOrgApplicationDTO): Promise<OrgApplicationEntity> {
        const existing = await this.appRepository.findByUserId(userId);
        const hasPending = existing.some((a) => a.isPending());
        if (hasPending) {
            throw new ConflictException('이미 심사 중인 신청이 있습니다.');
        }
        return this.appRepository.create({ userId, ...data });
    }

    async approveApplication(applicationId: number): Promise<{ application: OrgApplicationEntity; organization: OrganizationEntity }> {
        const app = await this.getApplicationById(applicationId);
        if (!app.isPending()) {
            throw new BadRequestException('PENDING 상태의 신청만 승인할 수 있습니다.');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: app.orgName,
                    registrationNumber: app.registrationNumber,
                    status: 'APPROVED',
                },
            });

            await tx.orgMember.create({
                data: {
                    orgId: org.orgId,
                    userId: app.userId,
                    role: 'ADMIN',
                },
            });

            const updated = await tx.orgApplication.update({
                where: { applicationId },
                data: {
                    status: 'APPROVED',
                    reviewedAt: new Date(),
                },
            });

            return { org, updated };
        });

        const organization = OrganizationEntity.create({
            orgId: result.org.orgId,
            name: result.org.name,
            registrationNumber: result.org.registrationNumber,
            description: result.org.description,
            logoUrl: result.org.logoUrl,
            walletAddress: result.org.walletAddress,
            contactInfo: result.org.contactInfo,
            isVerified: result.org.isVerified,
            planType: result.org.planType,
            status: result.org.status,
            createdAt: result.org.createdAt,
            updatedAt: result.org.updatedAt,
        });

        const application = OrgApplicationEntity.create({
            applicationId: result.updated.applicationId,
            userId: result.updated.userId,
            orgName: result.updated.orgName,
            registrationNumber: result.updated.registrationNumber,
            registrationDocUrl: result.updated.registrationDocUrl,
            contactName: result.updated.contactName,
            contactPhone: result.updated.contactPhone,
            contactEmail: result.updated.contactEmail,
            description: result.updated.description,
            status: result.updated.status,
            rejectedReason: result.updated.rejectedReason,
            reviewedAt: result.updated.reviewedAt,
            createdAt: result.updated.createdAt,
        });

        return { application, organization };
    }

    async rejectApplication(applicationId: number, rejectedReason: string): Promise<OrgApplicationEntity> {
        const app = await this.getApplicationById(applicationId);
        if (!app.isPending()) {
            throw new BadRequestException('PENDING 상태의 신청만 반려할 수 있습니다.');
        }

        const updated = await this.appRepository.updateStatus(applicationId, {
            status: 'REJECTED',
            rejectedReason,
            reviewedAt: new Date(),
        });
        if (!updated) {
            throw new NotFoundException('Application not found');
        }
        return updated;
    }
}
