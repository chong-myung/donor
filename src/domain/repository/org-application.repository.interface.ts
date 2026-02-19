import { OrgApplicationEntity } from '../entity/org-application.entity';

export interface IOrgApplicationsRepository {
    findAll(status?: string): Promise<OrgApplicationEntity[]>;
    findById(id: number): Promise<OrgApplicationEntity | null>;
    findByUserId(userId: number): Promise<OrgApplicationEntity[]>;
    create(data: {
        userId: number;
        orgName: string;
        registrationNumber?: string | null;
        registrationDocUrl?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactEmail?: string | null;
        description?: string | null;
    }): Promise<OrgApplicationEntity>;
    updateStatus(id: number, data: {
        status: string;
        rejectedReason?: string | null;
        reviewedAt?: Date;
    }): Promise<OrgApplicationEntity | null>;
}
