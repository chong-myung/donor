import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../../../domain/entity/user.entity';
import { IUsersRepository } from '../../../domain/repository/users.repository.interface';
import { CreateUserDTO, UpdateUserDTO } from '../../../application/dto/user.dto';

@Injectable()
export class UserRepository implements IUsersRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<UserEntity[]> {
        const users = await this.prisma.user.findMany();
        return users.map(this.mapToEntity);
    }

    async findById(id: number): Promise<UserEntity | null> {
        const user = await this.prisma.user.findUnique({
            where: { userId: id },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async findByWalletAddress(walletAddress: string): Promise<UserEntity | null> {
        const user = await this.prisma.user.findUnique({
            where: { walletAddress },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async create(data: CreateUserDTO): Promise<UserEntity> {
        const newUser = await this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: data.passwordHash,
                loginPlatform: data.loginPlatform,
                walletAddress: data.walletAddress,
                isActive: true,
            },
        });
        return this.mapToEntity(newUser);
    }

    async update(id: number, data: UpdateUserDTO): Promise<UserEntity | null> {
        try {
            const updatedUser = await this.prisma.user.update({
                where: { userId: id },
                data: {
                    email: data.email,
                    passwordHash: data.passwordHash,
                    walletAddress: data.walletAddress,
                    isActive: data.isActive,
                },
            });
            return this.mapToEntity(updatedUser);
        } catch (error) {
            // Handle case where user might not exist, though typically ensured by existence check or try-catch
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.user.delete({
                where: { userId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapToEntity(data: any): UserEntity {
        return new UserEntity(
            data.userId,
            data.email,
            data.passwordHash,
            data.loginPlatform,
            data.walletAddress,
            data.isActive ?? true,
            data.createdAt
        );
    }
}
