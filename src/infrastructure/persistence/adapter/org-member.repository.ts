import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IOrgMembersRepository } from '../../../domain/repository/org-member.repository.interface';
import { OrgMemberEntity } from '../../../domain/entity/org-member.entity';

@Injectable()
export class OrgMemberRepository implements IOrgMembersRepository {
    constructor(private prisma: PrismaService) {}

    async findByOrgId(orgId: number): Promise<OrgMemberEntity[]> {
        const members = await this.prisma.orgMember.findMany({
            where: { orgId },
            orderBy: { joinedAt: 'asc' },
        });
        return members.map(this.mapToEntity);
    }

    async findByUserId(userId: number): Promise<OrgMemberEntity[]> {
        const members = await this.prisma.orgMember.findMany({
            where: { userId },
            orderBy: { joinedAt: 'desc' },
        });
        return members.map(this.mapToEntity);
    }

    async findByOrgAndUser(orgId: number, userId: number): Promise<OrgMemberEntity | null> {
        const member = await this.prisma.orgMember.findUnique({
            where: { orgId_userId: { orgId, userId } },
        });
        return member ? this.mapToEntity(member) : null;
    }

    async create(data: {
        orgId: number;
        userId: number;
        role?: string;
    }): Promise<OrgMemberEntity> {
        const member = await this.prisma.orgMember.create({
            data: {
                orgId: data.orgId,
                userId: data.userId,
                role: data.role ?? 'ADMIN',
            },
        });
        return this.mapToEntity(member);
    }

    async delete(orgMemberId: number): Promise<boolean> {
        try {
            await this.prisma.orgMember.delete({
                where: { orgMemberId },
            });
            return true;
        } catch {
            return false;
        }
    }

    private mapToEntity(data: any): OrgMemberEntity {
        return OrgMemberEntity.create({
            orgMemberId: data.orgMemberId,
            orgId: data.orgId,
            userId: data.userId,
            role: data.role,
            joinedAt: data.joinedAt,
        });
    }
}
