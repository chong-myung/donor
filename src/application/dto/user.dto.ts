
import { ApiProperty } from '@nestjs/swagger';

export interface CreateUserDTO {
  email: string;
  passwordHash?: string | null;
  loginPlatform: string;
  walletAddress?: string | null;
  isActive?: boolean;
  role?: string;
}

export interface UpdateUserDTO {
  email?: string;
  passwordHash?: string | null;
  walletAddress?: string | null;
  isActive?: boolean;
}

export class UserResponseDTO {
  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 'user@example.com', description: 'User Email' })
  email: string;

  @ApiProperty({ example: 'google', description: 'Login Platform' })
  loginPlatform: string;

  @ApiProperty({ example: true, description: 'Is Active User' })
  isActive: boolean;

  @ApiProperty({ example: 'DONOR', description: 'User Role' })
  role: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Created At' })
  createdAt: Date;
}

