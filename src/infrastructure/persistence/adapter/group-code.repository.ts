import { Injectable } from '@nestjs/common';
import { IGroupCodeRepository } from '../../../domain/repository/group-code.repository.interface';
import { GroupCodeEntity } from '../../../domain/entity/group-code.entity';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupCodeRepository implements IGroupCodeRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<GroupCodeEntity[]> {
        const rows = await this.prisma.groupCode.findMany();
        return rows.map(r => new GroupCodeEntity(r.groupCode, r.groupName, r.useYn, r.description, r.createdAt));
    }

    async findByGroupCode(groupCode: string): Promise<GroupCodeEntity | null> {
        const row = await this.prisma.groupCode.findUnique({ where: { groupCode } });
        if (!row) return null;
        return new GroupCodeEntity(row.groupCode, row.groupName, row.useYn, row.description, row.createdAt);
    }

    async create(entity: GroupCodeEntity): Promise<GroupCodeEntity> {
        const row = await this.prisma.groupCode.create({
            data: {
                groupCode: entity.groupCode,
                groupName: entity.groupName,
                useYn: entity.useYn,
                description: entity.description,
                createdAt: entity.createdAt,
            }
        });
        return new GroupCodeEntity(row.groupCode, row.groupName, row.useYn, row.description, row.createdAt);
    }
}
