export interface CreateUserDTO {
  email: string;
  passwordHash?: string | null;
  loginPlatform: string;
  walletAddress?: string | null;
  isActive?: boolean;
}

export interface UpdateUserDTO {
  email?: string;
  passwordHash?: string | null;
  walletAddress?: string | null;
  isActive?: boolean;
}

// src/domain/interfaces/dtos/organization.dto.ts
export interface CreateOrganizationDTO {
  name: string;
  registrationNumber?: string | null;
  walletAddress: string;
  contactInfo?: string | null;
}

export interface UpdateOrganizationDTO {
  name?: string;
  registrationNumber?: string | null;
  walletAddress?: string;
  contactInfo?: string | null;
}