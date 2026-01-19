import { ProjectEntity } from "./project.entity";

export class BeneficiaryEntity {
    constructor(
        public readonly beneficiaryId: number,
        public readonly name: string,
        public readonly bio: string | null,
        public readonly walletAddress: string,
        public readonly contactInfo: string | null,
        public readonly isVerified: boolean,
        public readonly createdAt: Date,
        public readonly projects?: ProjectEntity[]
    ) { }

    static create(data: {
        beneficiaryId: number;
        name: string;
        bio?: string | null;
        walletAddress: string;
        contactInfo?: string | null;
        isVerified?: boolean;
        createdAt?: Date;
        projects?: ProjectEntity[];
    }): BeneficiaryEntity {
        return new BeneficiaryEntity(
            data.beneficiaryId,
            data.name,
            data.bio ?? null,
            data.walletAddress,
            data.contactInfo ?? null,
            data.isVerified ?? false,
            data.createdAt ?? new Date(),
            data.projects
        );
    }

    toJSON(): any {
        return {
            beneficiaryId: this.beneficiaryId,
            name: this.name,
            bio: this.bio,
            walletAddress: this.walletAddress,
            contactInfo: this.contactInfo,
            isVerified: this.isVerified,
            createdAt: this.createdAt,
            projects: this.projects?.map(p => p.toJSON()),
        };
    }
}
