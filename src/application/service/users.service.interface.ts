import { UserEntity } from '../../domain/entity/user.entity';
import { CreateUserDTO, UpdateUserDTO } from '../dto/user.dto';

export interface IUsersService {
  getAllUsers(): Promise<UserEntity[]>;
  getUserById(id: number): Promise<UserEntity>;
  getUserByEmail(email: string): Promise<UserEntity>;
  createUser(data: CreateUserDTO): Promise<UserEntity>;
  updateUser(id: number, data: UpdateUserDTO): Promise<UserEntity>;
  deleteUser(id: number): Promise<void>;
}