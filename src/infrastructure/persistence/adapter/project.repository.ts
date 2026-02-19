import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IProjectsRepository } from '../../../domain/repository/projects.repository.interface';
import { ProjectFilterDTO, CreateProjectDTO, UpdateProjectDTO } from '@/application/dto/project.dto';
import { ProjectEntity } from '@/domain/entity/project.entity';
import { OrganizationEntity } from '@/domain/entity/organization.entity';
import { BeneficiaryEntity } from '@/domain/entity/beneficiary.entity';

@Injectable()
export class ProjectRepository implements IProjectsRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(filter?: ProjectFilterDTO): Promise<ProjectEntity[]> {
        const where: any = {};
        if (filter?.nation) where.nation = filter.nation;
        if (filter?.status) where.status = filter.status;
        if (filter?.minGoalAmount || filter?.maxGoalAmount) {
            where.goalAmount = {};
            if (filter.minGoalAmount) where.goalAmount.gte = parseFloat(filter.minGoalAmount);
            if (filter.maxGoalAmount) where.goalAmount.lte = parseFloat(filter.maxGoalAmount);
        }

        const page = filter?.page ?? 1;
        const limit = filter?.limit ?? 20;

        const projects = await this.prisma.project.findMany({
            where,
            include: { organization: true, beneficiary: true },
            orderBy: [
                { organization: { planType: 'desc' } },
                { projectId: 'desc' },
            ],
            skip: (page - 1) * limit,
            take: limit,
        });
        return projects.map(this.mapToEntity);
    }

    async findById(id: number): Promise<ProjectEntity | null> {
        const project = await this.prisma.project.findUnique({
            where: { projectId: id },
            include: { organization: true, beneficiary: true },
        });
        return project ? this.mapToEntity(project) : null;
    }

    async findByOrganization(orgId: number): Promise<ProjectEntity[]> {
        const projects = await this.prisma.project.findMany({
            where: { orgId },
            include: { organization: true, beneficiary: true },
        });
        return projects.map(this.mapToEntity);
    }

    async findByStatus(status: string): Promise<ProjectEntity[]> {
        const projects = await this.prisma.project.findMany({
            where: { status },
            include: { organization: true, beneficiary: true },
        });
        return projects.map(this.mapToEntity);
    }

    async create(data: CreateProjectDTO): Promise<ProjectEntity> {
        const project = await this.prisma.project.create({
            data: {
                orgId: data.orgId,
                nation: data.nation,
                title: data.title,
                thumbnailUrl: data.thumbnailUrl,
                shortDescription: data.shortDescription,
                detailedDescription: data.detailedDescription,
                goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : null,
                status: data.status,
                startDate: data.startDate,
            },
            include: { organization: true, beneficiary: true },
        });
        return this.mapToEntity(project);
    }

    async update(id: number, data: UpdateProjectDTO): Promise<ProjectEntity | null> {
        try {
            const project = await this.prisma.project.update({
                where: { projectId: id },
                data: {
                    title: data.title,
                    thumbnailUrl: data.thumbnailUrl,
                    shortDescription: data.shortDescription,
                    detailedDescription: data.detailedDescription,
                    goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : undefined,
                    currentRaisedUsdc: data.currentRaisedUsdc ? parseFloat(data.currentRaisedUsdc) : undefined,
                    status: data.status,
                    startDate: data.startDate,
                },
                include: { organization: true, beneficiary: true },
            });
            return this.mapToEntity(project);
        } catch (error) {
            return null;
        }
    }

    async updateRaisedAmount(projectId: number, amount: string): Promise<void> {
        await this.prisma.project.update({
            where: { projectId },
            data: { currentRaisedUsdc: parseFloat(amount) },
        });
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.project.delete({
                where: { projectId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapToEntity(data: any): ProjectEntity {
        return ProjectEntity.create({
            projectId: data.projectId,
            orgId: data.orgId,
            beneficiaryId: data.beneficiaryId,
            nation: data.nation,
            title: data.title,
            thumbnailUrl: data.thumbnailUrl,
            shortDescription: data.shortDescription,
            detailedDescription: data.detailedDescription,
            goalAmount: data.goalAmount?.toString() ?? null,
            currentRaisedUsdc: data.currentRaisedUsdc?.toString() ?? '0.00',
            status: data.status,
            startDate: data.startDate,
            organization: data.organization
                ? OrganizationEntity.create(data.organization)
                : undefined,
            beneficiary: data.beneficiary
                ? BeneficiaryEntity.create(data.beneficiary)
                : undefined,
        });
    }
}
