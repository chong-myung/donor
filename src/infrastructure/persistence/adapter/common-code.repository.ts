import { Injectable } from '@nestjs/common';
import { ICommonCodeRepository } from '../../../domain/repository/common-code.repository.interface';
import { CommonCodeEntity } from '../../../domain/entity/common-code.entity';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommonCodeRepository implements ICommonCodeRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(groupCode: string): Promise<CommonCodeEntity[]> {
        const rows = await this.prisma.commonCode.findMany({
            where: { groupCode, useYn: 'Y' },
            orderBy: { sortOrder: 'asc' }
        });
        return rows.map(r => new CommonCodeEntity(r.groupCode, r.codeId, r.codeName, r.codeNameKo, r.sortOrder, r.useYn, r.createdAt));
    }

    async findByCodeId(groupCode: string, codeId: string): Promise<CommonCodeEntity | null> {
        const row = await this.prisma.commonCode.findUnique({
            where: { groupCode_codeId: { groupCode, codeId } }
        });
        if (!row) return null;
        return new CommonCodeEntity(row.groupCode, row.codeId, row.codeName, row.codeNameKo, row.sortOrder, row.useYn, row.createdAt);
    }

    async create(entity: CommonCodeEntity): Promise<CommonCodeEntity> {
        const row = await this.prisma.commonCode.create({
            data: {
                groupCode: entity.groupCode,
                codeId: entity.codeId,
                codeName: entity.codeName,
                codeNameKo: entity.codeNameKo,
                sortOrder: entity.sortOrder,
                useYn: entity.useYn,
                createdAt: entity.createdAt,
            }
        });
        return new CommonCodeEntity(row.groupCode, row.codeId, row.codeName, row.codeNameKo, row.sortOrder, row.useYn, row.createdAt);
    }
}
