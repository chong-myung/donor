import { DonationEntity } from '../../domain/entity/donation.entity';
import { CreateDonationDTO, UpdateDonationDTO, DonationFilterDTO } from '../dto/donation.dto';

export interface IDonationsService {
  getAllDonations(filter?: DonationFilterDTO): Promise<DonationEntity[]>;
  getDonationById(id: number): Promise<DonationEntity>;
  getDonationsByUser(userId: number): Promise<DonationEntity[]>;
  getDonationsByProject(projectId: number): Promise<DonationEntity[]>;
  createDonation(data: CreateDonationDTO): Promise<DonationEntity>;
  updateDonation(id: number, data: UpdateDonationDTO): Promise<DonationEntity>;
  deleteDonation(id: number): Promise<void>;
}
