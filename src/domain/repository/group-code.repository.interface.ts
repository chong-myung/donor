import { GroupCodeEntity } from '../entity/group-code.entity';

export interface IGroupCodeRepository {
    findAll(): Promise<GroupCodeEntity[]>;
    findByGroupCode(groupCode: string): Promise<GroupCodeEntity | null>;
    create(entity: GroupCodeEntity): Promise<GroupCodeEntity>;
    // Add update/delete if needed
}
