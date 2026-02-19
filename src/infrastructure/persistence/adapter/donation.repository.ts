import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IDonationsRepository } from '../../../domain/repository/donations.repository.interface';
import { DonationEntity } from '../../../domain/entity/donation.entity';
import { CreateDonationDTO, UpdateDonationDTO, DonationFilterDTO } from '../../../application/dto/donation.dto';

@Injectable()
export class DonationRepository implements IDonationsRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(filter?: DonationFilterDTO): Promise<DonationEntity[]> {
        const where: any = {};
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.projectId) where.projectId = filter.projectId;
        if (filter?.coinType) where.coinType = filter.coinType;
        if (filter?.status) where.status = filter.status;
        if (filter?.isAnonymous !== undefined) where.isAnonymous = filter.isAnonymous;
        if (filter?.startDate || filter?.endDate) {
            where.donationDate = {};
            if (filter.startDate) where.donationDate.gte = filter.startDate;
            if (filter.endDate) where.donationDate.lte = filter.endDate;
        }

        const donations = await this.prisma.donation.findMany({
            where,
            include: { user: true, project: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(this.mapToEntity);
    }

    async findById(id: number): Promise<DonationEntity | null> {
        const donation = await this.prisma.donation.findUnique({
            where: { donationId: id },
            include: { user: true, project: true },
        });
        return donation ? this.mapToEntity(donation) : null;
    }

    async findByUser(userId: number): Promise<DonationEntity[]> {
        const donations = await this.prisma.donation.findMany({
            where: { userId },
            include: { project: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(this.mapToEntity);
    }

    async findByProject(projectId: number): Promise<DonationEntity[]> {
        const donations = await this.prisma.donation.findMany({
            where: { projectId },
            include: { user: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(this.mapToEntity);
    }

    async findByTransactionHash(hash: string): Promise<DonationEntity | null> {
        const donation = await this.prisma.donation.findUnique({
            where: { transactionHash: hash },
            include: { user: true, project: true },
        });
        return donation ? this.mapToEntity(donation) : null;
    }

    async create(data: CreateDonationDTO): Promise<DonationEntity> {
        const donation = await this.prisma.donation.create({
            data: {
                userId: data.userId,
                projectId: data.projectId,
                fiatAmount: data.fiatAmount ? parseFloat(data.fiatAmount) : null,
                fiatCurrency: data.fiatCurrency,
                coinAmount: parseFloat(data.coinAmount),
                coinType: data.coinType,
                conversionRate: data.conversionRate ? parseFloat(data.conversionRate) : null,
                transactionHash: data.transactionHash,
                isAnonymous: data.isAnonymous ?? false,
                status: data.status,
            },
            include: { user: true, project: true },
        });
        return this.mapToEntity(donation);
    }

    async update(id: number, data: UpdateDonationDTO): Promise<DonationEntity | null> {
        try {
            const donation = await this.prisma.donation.update({
                where: { donationId: id },
                data: {
                    status: data.status,
                    fiatAmount: data.fiatAmount ? parseFloat(data.fiatAmount) : undefined,
                    fiatCurrency: data.fiatCurrency,
                    coinAmount: data.coinAmount ? parseFloat(data.coinAmount) : undefined,
                    conversionRate: data.conversionRate ? parseFloat(data.conversionRate) : undefined,
                },
                include: { user: true, project: true },
            });
            return this.mapToEntity(donation);
        } catch (error) {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.donation.delete({
                where: { donationId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async getTotalByProject(projectId: number): Promise<string> {
        const result = await this.prisma.donation.aggregate({
            where: { projectId, status: 'Confirmed' },
            _sum: { coinAmount: true },
        });
        return result._sum.coinAmount?.toString() ?? '0.00';
    }

    private mapToEntity(data: any): DonationEntity {
        return DonationEntity.create({
            donationId: data.donationId,
            userId: data.userId,
            projectId: data.projectId,
            fiatAmount: data.fiatAmount?.toString() ?? null,
            fiatCurrency: data.fiatCurrency,
            coinAmount: data.coinAmount.toString(),
            coinType: data.coinType,
            conversionRate: data.conversionRate?.toString() ?? null,
            transactionHash: data.transactionHash,
            donationDate: data.donationDate,
            isAnonymous: data.isAnonymous ?? false,
            status: data.status,
        });
    }
}
