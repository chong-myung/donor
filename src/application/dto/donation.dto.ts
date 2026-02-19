import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { DonationEntity } from '@/domain/entity/donation.entity';

export class CreateDonationDTO {
    @ApiPropertyOptional({ description: '기부자 ID' })
    @IsOptional()
    @IsNumber()
    userId?: number | null;

    @ApiProperty({ description: '프로젝트 ID' })
    @IsNumber()
    projectId: number;

    @ApiPropertyOptional({ description: '법정 화폐 금액' })
    @IsOptional()
    @IsString()
    fiatAmount?: string | null;

    @ApiPropertyOptional({ description: '법정 화폐 종류', example: 'USD' })
    @IsOptional()
    @IsString()
    fiatCurrency?: string | null;

    @ApiProperty({ description: '코인 금액', example: '100.00000000' })
    @IsString()
    coinAmount: string;

    @ApiProperty({ description: '코인 종류', example: 'USDC' })
    @IsString()
    coinType: string;

    @ApiPropertyOptional({ description: '환율' })
    @IsOptional()
    @IsString()
    conversionRate?: string | null;

    @ApiProperty({ description: '트랜잭션 해시' })
    @IsString()
    transactionHash: string;

    @ApiPropertyOptional({ description: '익명 기부 여부', default: false })
    @IsOptional()
    @IsBoolean()
    isAnonymous?: boolean;

    @ApiProperty({ description: '기부 상태', example: 'Pending' })
    @IsString()
    status: string;
}

export class UpdateDonationDTO {
    @ApiPropertyOptional({ description: '상태' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fiatAmount?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fiatCurrency?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    coinAmount?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    conversionRate?: string | null;
}

export class DonationFilterDTO {
    @ApiPropertyOptional()
    userId?: number;

    @ApiPropertyOptional()
    projectId?: number;

    @ApiPropertyOptional()
    coinType?: string;

    @ApiPropertyOptional()
    status?: string;

    @ApiPropertyOptional()
    isAnonymous?: boolean;

    @ApiPropertyOptional()
    startDate?: Date;

    @ApiPropertyOptional()
    endDate?: Date;
}

// 기부 목록 응답 매퍼
export const toDonationList = (donations: DonationEntity[]) => {
    return donations.map((d) => ({
        donationId: d.donationId,
        projectId: d.projectId,
        coinAmount: d.coinAmount,
        coinType: d.coinType,
        donationDate: d.donationDate,
        isAnonymous: d.isAnonymous,
        status: d.status,
    }));
};

// 기부 상세 응답 매퍼
export const toDonationDetail = (d: DonationEntity) => {
    return {
        donationId: d.donationId,
        userId: d.isAnonymous ? null : d.userId,
        projectId: d.projectId,
        fiatAmount: d.fiatAmount,
        fiatCurrency: d.fiatCurrency,
        coinAmount: d.coinAmount,
        coinType: d.coinType,
        conversionRate: d.conversionRate,
        transactionHash: d.transactionHash,
        donationDate: d.donationDate,
        isAnonymous: d.isAnonymous,
        status: d.status,
    };
};
