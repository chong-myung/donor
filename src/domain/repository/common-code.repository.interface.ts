import { CommonCodeEntity } from '../entity/common-code.entity';

export interface ICommonCodeRepository {
    findAll(groupCode: string): Promise<CommonCodeEntity[]>;
    findByCodeId(groupCode: string, codeId: string): Promise<CommonCodeEntity | null>;
    create(entity: CommonCodeEntity): Promise<CommonCodeEntity>;
    // Add update/delete if needed
}
