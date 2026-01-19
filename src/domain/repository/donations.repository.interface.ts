import { DonationEntity } from '../entity/donation.entity';
import { CreateDonationDTO, UpdateDonationDTO, DonationFilterDTO } from '../../application/dto/donation.dto';

export interface IDonationsRepository {
  findAll(filter?: DonationFilterDTO): Promise<DonationEntity[]>;
  findById(id: number): Promise<DonationEntity | null>;
  findByUser(userId: number): Promise<DonationEntity[]>;
  findByProject(projectId: number): Promise<DonationEntity[]>;
  findByTransactionHash(hash: string): Promise<DonationEntity | null>;
  create(data: CreateDonationDTO): Promise<DonationEntity>;
  update(id: number, data: UpdateDonationDTO): Promise<DonationEntity | null>;
  delete(id: number): Promise<boolean>;
  getTotalByProject(projectId: number): Promise<string>;
}