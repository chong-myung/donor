export class OrgMemberEntity {
    constructor(
        public readonly orgMemberId: number,
        public readonly orgId: number,
        public readonly userId: number,
        public readonly role: string,
        public readonly joinedAt: Date,
    ) {}

    static create(data: {
        orgMemberId: number;
        orgId: number;
        userId: number;
        role?: string;
        joinedAt?: Date;
    }): OrgMemberEntity {
        return new OrgMemberEntity(
            data.orgMemberId,
            data.orgId,
            data.userId,
            data.role ?? 'ADMIN',
            data.joinedAt ?? new Date(),
        );
    }

    isAdmin(): boolean {
        return this.role === 'ADMIN';
    }

    isManager(): boolean {
        return this.role === 'MANAGER';
    }

    toJSON() {
        return {
            orgMemberId: this.orgMemberId,
            orgId: this.orgId,
            userId: this.userId,
            role: this.role,
            joinedAt: this.joinedAt,
        };
    }
}
