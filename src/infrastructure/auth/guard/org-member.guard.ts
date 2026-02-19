import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { ORG_ROLES_KEY } from '../../../common/decorators/org-roles.decorator';

@Injectable()
export class OrgMemberGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;
        if (!userId) {
            throw new ForbiddenException('인증 정보가 없습니다.');
        }

        const membership = await this.prisma.orgMember.findFirst({
            where: { userId },
            orderBy: { joinedAt: 'asc' },
        });

        if (!membership) {
            throw new ForbiddenException('기관 소속이 아닙니다.');
        }

        request.orgMember = {
            orgMemberId: membership.orgMemberId,
            orgId: membership.orgId,
            userId: membership.userId,
            role: membership.role,
        };

        const requiredOrgRoles = this.reflector.getAllAndOverride<string[]>(ORG_ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredOrgRoles) {
            return true;
        }

        const hasRole = requiredOrgRoles.some((role) => membership.role === role);
        if (!hasRole) {
            throw new ForbiddenException('해당 작업에 대한 권한이 없습니다.');
        }

        return true;
    }
}
