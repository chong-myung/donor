import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IDonationsService } from './donations.service.interface';
import { IDonationsRepository } from '../../domain/repository/donations.repository.interface';
import { DonationEntity } from '../../domain/entity/donation.entity';
import { CreateDonationDTO, UpdateDonationDTO, DonationFilterDTO } from '../dto/donation.dto';

@Injectable()
export class DonationService implements IDonationsService {
    constructor(
        @Inject('IDonationsRepository')
        private readonly donationRepository: IDonationsRepository,
    ) {}

    async getAllDonations(filter?: DonationFilterDTO): Promise<DonationEntity[]> {
        return this.donationRepository.findAll(filter);
    }

    async getDonationById(id: number): Promise<DonationEntity> {
        const donation = await this.donationRepository.findById(id);
        if (!donation) {
            throw new NotFoundException('Donation not found');
        }
        return donation;
    }

    async getDonationsByUser(userId: number): Promise<DonationEntity[]> {
        return this.donationRepository.findByUser(userId);
    }

    async getDonationsByProject(projectId: number): Promise<DonationEntity[]> {
        return this.donationRepository.findByProject(projectId);
    }

    async createDonation(data: CreateDonationDTO): Promise<DonationEntity> {
        return this.donationRepository.create(data);
    }

    async updateDonation(id: number, data: UpdateDonationDTO): Promise<DonationEntity> {
        const updated = await this.donationRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Donation not found or update failed');
        }
        return updated;
    }

    async deleteDonation(id: number): Promise<void> {
        const deleted = await this.donationRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Donation not found or delete failed');
        }
    }

    async getTotalByProject(projectId: number): Promise<string> {
        return this.donationRepository.getTotalByProject(projectId);
    }
}
