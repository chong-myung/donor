import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { OrganizationEntity } from '@/domain/entity/organization.entity';

export class CreateOrganizationDTO {
    @ApiProperty({ description: '기관명', example: 'Save the Children' })
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ description: '사업자등록번호' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    registrationNumber?: string | null;

    @ApiPropertyOptional({ description: '기관 소개' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ description: '로고 URL' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    logoUrl?: string | null;

    @ApiPropertyOptional({ description: '지갑 주소', example: 'rXXXXXXXXXX' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    walletAddress?: string | null;

    @ApiPropertyOptional({ description: '연락처 정보' })
    @IsOptional()
    @IsString()
    contactInfo?: string | null;

    @ApiPropertyOptional({ description: '플랜 타입', default: 'FREE', enum: ['FREE', 'PLUS'] })
    @IsOptional()
    @IsString()
    planType?: string;

    @ApiPropertyOptional({ description: '상태', default: 'PENDING', enum: ['PENDING', 'APPROVED', 'SUSPENDED'] })
    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateOrganizationDTO {
    @ApiPropertyOptional({ description: '기관명' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ description: '사업자등록번호' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    registrationNumber?: string | null;

    @ApiPropertyOptional({ description: '기관 소개' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ description: '로고 URL' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    logoUrl?: string | null;

    @ApiPropertyOptional({ description: '지갑 주소' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    walletAddress?: string;

    @ApiPropertyOptional({ description: '연락처 정보' })
    @IsOptional()
    @IsString()
    contactInfo?: string | null;

    @ApiPropertyOptional({ description: '인증 여부' })
    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @ApiPropertyOptional({ description: '플랜 타입', enum: ['FREE', 'PLUS'] })
    @IsOptional()
    @IsString()
    planType?: string;

    @ApiPropertyOptional({ description: '상태', enum: ['PENDING', 'APPROVED', 'SUSPENDED'] })
    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateWalletDTO {
    @ApiProperty({ description: '새 지갑 주소', example: 'rXXXXXXXXXX' })
    @IsString()
    @MaxLength(100)
    walletAddress: string;
}

export const toOrganizationList = (orgs: OrganizationEntity[]) => {
    return orgs.map((org) => ({
        orgId: org.orgId,
        name: org.name,
        logoUrl: org.logoUrl,
        walletAddress: org.walletAddress,
        isVerified: org.isVerified,
        planType: org.planType,
        status: org.status,
        createdAt: org.createdAt,
    }));
};

export const toOrganizationDetail = (org: OrganizationEntity) => {
    return {
        orgId: org.orgId,
        name: org.name,
        registrationNumber: org.registrationNumber,
        description: org.description,
        logoUrl: org.logoUrl,
        walletAddress: org.walletAddress,
        contactInfo: org.contactInfo,
        isVerified: org.isVerified,
        planType: org.planType,
        status: org.status,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
    };
};
