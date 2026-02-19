export class OrganizationEntity {
    constructor(
        public readonly orgId: number,
        public readonly name: string,
        public readonly registrationNumber: string | null,
        public readonly description: string | null,
        public readonly logoUrl: string | null,
        public readonly walletAddress: string | null,
        public readonly contactInfo: string | null,
        public readonly isVerified: boolean,
        public readonly planType: string,
        public readonly status: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date | null,
    ) {}

    static create(data: {
        orgId: number;
        name: string;
        registrationNumber?: string | null;
        description?: string | null;
        logoUrl?: string | null;
        walletAddress?: string | null;
        contactInfo?: string | null;
        isVerified?: boolean;
        planType?: string;
        status?: string;
        createdAt?: Date;
        updatedAt?: Date | null;
    }): OrganizationEntity {
        return new OrganizationEntity(
            data.orgId,
            data.name,
            data.registrationNumber ?? null,
            data.description ?? null,
            data.logoUrl ?? null,
            data.walletAddress ?? null,
            data.contactInfo ?? null,
            data.isVerified ?? false,
            data.planType ?? 'FREE',
            data.status ?? 'PENDING',
            data.createdAt ?? new Date(),
            data.updatedAt ?? null,
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
            description: this.description,
            logoUrl: this.logoUrl,
            walletAddress: this.walletAddress,
            contactInfo: this.contactInfo,
            isVerified: this.isVerified,
            planType: this.planType,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
