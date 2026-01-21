import { Injectable, Inject } from '@nestjs/common';
import { IUsersRepository } from '../../domain/repository/users.repository.interface';
import { CreateUserDTO } from '../dto/user.dto';
import { UserEntity } from '../../domain/entity/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UserService {
    constructor(
        @Inject('IUsersRepository') private readonly usersRepository: IUsersRepository
    ) { }

    private refreshTokens = new Map<number, string>();

    async register(data: CreateUserDTO): Promise<UserEntity> {
        const existingUser = await this.usersRepository.findByEmail(data.email);
        if (existingUser) {
            throw new Error('Email already exists');
        }

        const hashedPassword = data.passwordHash
            ? await bcrypt.hash(data.passwordHash, 10)
            : null;

        const newUser = await this.usersRepository.create({
            ...data,
            passwordHash: hashedPassword,
        });

        return newUser;
    }

    async login(email: string, password: string): Promise<{ accessToken: string; user: UserEntity }> {
        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.passwordHash) {
            // Social login user trying to login with password, or just no password set
            throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        const accessToken = jwt.sign(
            { userId: user.userId, email: user.email },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1h' }
        );

        return { accessToken, user };
    }

    async findUserByEmail(email: string): Promise<UserEntity | null> {
        return this.usersRepository.findByEmail(email);
    }

    async findUserById(userId: number): Promise<UserEntity | null> {
        return this.usersRepository.findById(userId);
    }

    async createUser(data: CreateUserDTO): Promise<UserEntity> {
        // Can reuse register logic or direct repository call
        // Using repository directly to avoid 'Email already exists' error if we handled check outside
        // But register checks it too.
        // Let's rely on register for now if it fits, or just repo.
        // Given AuthService calls this only if user NOT found, direct repo create is fine.
        return this.usersRepository.create({
            ...data,
            passwordHash: null,
        });
    }

    async setUserRefreshToken(userId: number, refreshToken: string): Promise<void> {
        this.refreshTokens.set(userId, refreshToken);
    }

    async getUserRefreshToken(userId: number): Promise<string | undefined> {
        return this.refreshTokens.get(userId);
    }

    async info(userId: number): Promise<any> {
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user.toPublicJSON();
    }
}
