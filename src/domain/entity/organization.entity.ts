export class OrganizationEntity {
    constructor(
      public readonly orgId: number,
      public readonly name: string,
      public readonly registrationNumber: string | null,
      public readonly walletAddress: string,
      public readonly contactInfo: string | null,
      public readonly createdAt: Date
    ) {}
  
    static create(data: {
      orgId: number;
      name: string;
      registrationNumber?: string | null;
      walletAddress: string;
      contactInfo?: string | null;
      createdAt?: Date;
    }): OrganizationEntity {
      return new OrganizationEntity(
        data.orgId,
        data.name,
        data.registrationNumber ?? null,
        data.walletAddress,
        data.contactInfo ?? null,
        data.createdAt ?? new Date()
      );
    }
  
    toJSON() {
      return {
        orgId: this.orgId,
        name: this.name,
        registrationNumber: this.registrationNumber,
        walletAddress: this.walletAddress,
        contactInfo: this.contactInfo,
        createdAt: this.createdAt,
      };
    }
  }