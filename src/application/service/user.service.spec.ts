import { UserService } from './user.service';
import { IUsersRepository } from '../../domain/repository/users.repository.interface';
import { UserEntity } from '../../domain/entity/user.entity';
import { CreateUserDTO } from '../dto/user.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock dependencies
const mockUsersRepository: jest.Mocked<IUsersRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByWalletAddress: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        userService = new UserService(mockUsersRepository);
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should hash password and create user', async () => {
            const createUserDto: CreateUserDTO = {
                email: 'test@example.com',
                passwordHash: 'password123',
                loginPlatform: 'Email',
            };

            const hashedPassword = 'hashedPassword';
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

            const createdUser = new UserEntity(
                1,
                createUserDto.email,
                hashedPassword,
                createUserDto.loginPlatform,
                null,
                true,
                'DONOR',
                new Date()
            );

            mockUsersRepository.findByEmail.mockResolvedValue(null);
            mockUsersRepository.create.mockResolvedValue(createdUser);

            const result = await userService.register(createUserDto);

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(mockUsersRepository.create).toHaveBeenCalledWith({
                ...createUserDto,
                passwordHash: hashedPassword,
            });
            expect(result).toEqual(createdUser);
        });

        it('should throw error if email already exists', async () => {
            const createUserDto: CreateUserDTO = {
                email: 'existing@example.com',
                passwordHash: 'password123',
                loginPlatform: 'Email',
            };

            mockUsersRepository.findByEmail.mockResolvedValue(
                new UserEntity(1, 'existing@example.com', 'hash', 'Email', null, true, 'DONOR', new Date())
            );

            await expect(userService.register(createUserDto)).rejects.toThrow('Email already exists');
        });
    });

    describe('login', () => {
        it('should return token and user if credentials are valid', async () => {
            const email = 'test@example.com';
            const password = 'password123';
            const hashedPassword = 'hashedPassword';
            const user = new UserEntity(1, email, hashedPassword, 'Email', null, true, 'DONOR', new Date());
            const token = 'jwtToken';

            mockUsersRepository.findByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue(token);

            const result = await userService.login(email, password);

            expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(email);
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toEqual({ accessToken: token, user });
        });

        it('should throw error if user not found', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(null);

            await expect(userService.login('wrong@example.com', 'pass')).rejects.toThrow('Invalid credentials');
        });

        it('should throw error if password does not match', async () => {
            const user = new UserEntity(1, 'test@example.com', 'hash', 'Email', null, true, 'DONOR', new Date());
            mockUsersRepository.findByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(userService.login('test@example.com', 'wrongpass')).rejects.toThrow('Invalid credentials');
        });
    });
});
