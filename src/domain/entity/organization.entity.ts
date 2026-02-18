export class OrganizationEntity {
    constructor(
      public readonly orgId: number,
      public readonly name: string,
      public readonly registrationNumber: string | null,
      public readonly walletAddress: string,
      public readonly contactInfo: string | null,
      public readonly userId: number | null,
      public readonly planType: string,
      public readonly status: string,
      public readonly createdAt: Date
    ) {}

    static create(data: {
      orgId: number;
      name: string;
      registrationNumber?: string | null;
      walletAddress: string;
      contactInfo?: string | null;
      userId?: number | null;
      planType?: string;
      status?: string;
      createdAt?: Date;
    }): OrganizationEntity {
      return new OrganizationEntity(
        data.orgId,
        data.name,
        data.registrationNumber ?? null,
        data.walletAddress,
        data.contactInfo ?? null,
        data.userId ?? null,
        data.planType ?? 'FREE',
        data.status ?? 'PENDING',
        data.createdAt ?? new Date()
      );
    }

    isPlusPlan(): boolean {
      return this.planType === 'PLUS';
    }

    isApproved(): boolean {
      return this.status === 'APPROVED';
    }

    toJSON() {
      return {
        orgId: this.orgId,
        name: this.name,
        registrationNumber: this.registrationNumber,
        walletAddress: this.walletAddress,
        contactInfo: this.contactInfo,
        userId: this.userId,
        planType: this.planType,
        status: this.status,
        createdAt: this.createdAt,
      };
    }
  }
