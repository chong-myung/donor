import { ProjectEntity } from "./project.entity";
import { UserEntity } from "./user.entity";

export class DonationEntity {
    constructor(
      public readonly donationId: number,
      public readonly userId: number | null,
      public readonly projectId: number,
      public readonly fiatAmount: string | null,
      public readonly fiatCurrency: string | null,
      public readonly coinAmount: string,
      public readonly coinType: string,
      public readonly conversionRate: string | null,
      public readonly transactionHash: string,
      public readonly donationDate: Date,
      public readonly isAnonymous: boolean,
      public readonly status: string,
      public readonly user?: UserEntity,
      public readonly project?: ProjectEntity
    ) {}
  
    static create(data: {
      donationId: number;
      userId?: number | null;
      projectId: number;
      fiatAmount?: string | null;
      fiatCurrency?: string | null;
      coinAmount: string;
      coinType: string;
      conversionRate?: string | null;
      transactionHash: string;
      donationDate?: Date;
      isAnonymous?: boolean;
      status: string;
      user?: UserEntity;
      project?: ProjectEntity;
    }): DonationEntity {
      return new DonationEntity(
        data.donationId,
        data.userId ?? null,
        data.projectId,
        data.fiatAmount ?? null,
        data.fiatCurrency ?? null,
        data.coinAmount,
        data.coinType,
        data.conversionRate ?? null,
        data.transactionHash,
        data.donationDate ?? new Date(),
        data.isAnonymous ?? false,
        data.status,
        data.user,
        data.project
      );
    }
  
    toJSON() {
      return {
        donationId: this.donationId,
        userId: this.isAnonymous ? null : this.userId,
        projectId: this.projectId,
        fiatAmount: this.fiatAmount,
        fiatCurrency: this.fiatCurrency,
        coinAmount: this.coinAmount,
        coinType: this.coinType,
        conversionRate: this.conversionRate,
        transactionHash: this.transactionHash,
        donationDate: this.donationDate,
        isAnonymous: this.isAnonymous,
        status: this.status,
        user: this.isAnonymous ? null : this.user?.toPublicJSON(),
        project: this.project?.toJSON(),
      };
    }
  
    // USD 가치 계산 (USDC 기준)
    getUsdValue(): number {
      if (this.coinType === 'USDC') {
        return parseFloat(this.coinAmount);
      }
      if (this.conversionRate) {
        return parseFloat(this.coinAmount) * parseFloat(this.conversionRate);
      }
      return 0;
    }
  }