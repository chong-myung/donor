import { OrgMemberEntity } from '@/domain/entity/org-member.entity';

export const toOrgMemberList = (members: OrgMemberEntity[]) => {
    return members.map((m) => ({
        orgMemberId: m.orgMemberId,
        orgId: m.orgId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
    }));
};
