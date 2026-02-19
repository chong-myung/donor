export class OrgApplicationEntity {
    constructor(
        public readonly applicationId: number,
        public readonly userId: number,
        public readonly orgName: string,
        public readonly registrationNumber: string | null,
        public readonly registrationDocUrl: string | null,
        public readonly contactName: string | null,
        public readonly contactPhone: string | null,
        public readonly contactEmail: string | null,
        public readonly description: string | null,
        public readonly status: string,
        public readonly rejectedReason: string | null,
        public readonly reviewedAt: Date | null,
        public readonly createdAt: Date,
    ) {}

    static create(data: {
        applicationId: number;
        userId: number;
        orgName: string;
        registrationNumber?: string | null;
        registrationDocUrl?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactEmail?: string | null;
        description?: string | null;
        status?: string;
        rejectedReason?: string | null;
        reviewedAt?: Date | null;
        createdAt?: Date;
    }): OrgApplicationEntity {
        return new OrgApplicationEntity(
            data.applicationId,
            data.userId,
            data.orgName,
            data.registrationNumber ?? null,
            data.registrationDocUrl ?? null,
            data.contactName ?? null,
            data.contactPhone ?? null,
            data.contactEmail ?? null,
            data.description ?? null,
            data.status ?? 'PENDING',
            data.rejectedReason ?? null,
            data.reviewedAt ?? null,
            data.createdAt ?? new Date(),
        );
    }

    isPending(): boolean {
        return this.status === 'PENDING';
    }

    isApproved(): boolean {
        return this.status === 'APPROVED';
    }

    isRejected(): boolean {
        return this.status === 'REJECTED';
    }

    toJSON() {
        return {
            applicationId: this.applicationId,
            userId: this.userId,
            orgName: this.orgName,
            registrationNumber: this.registrationNumber,
            registrationDocUrl: this.registrationDocUrl,
            contactName: this.contactName,
            contactPhone: this.contactPhone,
            contactEmail: this.contactEmail,
            description: this.description,
            status: this.status,
            rejectedReason: this.rejectedReason,
            reviewedAt: this.reviewedAt,
            createdAt: this.createdAt,
        };
    }
}
