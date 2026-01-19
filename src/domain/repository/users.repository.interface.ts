import { UserEntity } from '../entity/user.entity';
import { CreateUserDTO, UpdateUserDTO } from '../../application/dto/user.dto';

export interface IUsersRepository {
  findAll(): Promise<UserEntity[]>;
  findById(id: number): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByWalletAddress(walletAddress: string): Promise<UserEntity | null>;
  create(data: CreateUserDTO): Promise<UserEntity>;
  update(id: number, data: UpdateUserDTO): Promise<UserEntity | null>;
  delete(id: number): Promise<boolean>;
}
