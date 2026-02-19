import { OrgMemberEntity } from '../entity/org-member.entity';

export interface IOrgMembersRepository {
    findByOrgId(orgId: number): Promise<OrgMemberEntity[]>;
    findByUserId(userId: number): Promise<OrgMemberEntity[]>;
    findByOrgAndUser(orgId: number, userId: number): Promise<OrgMemberEntity | null>;
    create(data: {
        orgId: number;
        userId: number;
        role?: string;
    }): Promise<OrgMemberEntity>;
    delete(orgMemberId: number): Promise<boolean>;
}
