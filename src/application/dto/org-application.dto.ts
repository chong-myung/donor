import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { OrgApplicationEntity } from '@/domain/entity/org-application.entity';

export class CreateOrgApplicationDTO {
    @ApiProperty({ description: '신청 기관명', example: 'Save the Children' })
    @IsString()
    @MaxLength(255)
    orgName: string;

    @ApiPropertyOptional({ description: '사업자등록번호' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    registrationNumber?: string | null;

    @ApiPropertyOptional({ description: '사업자등록증 URL' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    registrationDocUrl?: string | null;

    @ApiPropertyOptional({ description: '담당자 이름' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    contactName?: string | null;

    @ApiPropertyOptional({ description: '담당자 연락처' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    contactPhone?: string | null;

    @ApiPropertyOptional({ description: '담당자 이메일' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    contactEmail?: string | null;

    @ApiPropertyOptional({ description: '기관 소개 및 신청 사유' })
    @IsOptional()
    @IsString()
    description?: string | null;
}

export class RejectOrgApplicationDTO {
    @ApiProperty({ description: '반려 사유', example: '서류 미비' })
    @IsString()
    rejectedReason: string;
}

export const toOrgApplicationList = (apps: OrgApplicationEntity[]) => {
    return apps.map((app) => ({
        applicationId: app.applicationId,
        userId: app.userId,
        orgName: app.orgName,
        status: app.status,
        createdAt: app.createdAt,
        reviewedAt: app.reviewedAt,
    }));
};

export const toOrgApplicationDetail = (app: OrgApplicationEntity) => {
    return {
        applicationId: app.applicationId,
        userId: app.userId,
        orgName: app.orgName,
        registrationNumber: app.registrationNumber,
        registrationDocUrl: app.registrationDocUrl,
        contactName: app.contactName,
        contactPhone: app.contactPhone,
        contactEmail: app.contactEmail,
        description: app.description,
        status: app.status,
        rejectedReason: app.rejectedReason,
        reviewedAt: app.reviewedAt,
        createdAt: app.createdAt,
    };
};
