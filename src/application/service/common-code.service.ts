import { Injectable, Inject } from '@nestjs/common';
import { ICommonCodeRepository } from '../../domain/repository/common-code.repository.interface';
import { IGroupCodeRepository } from '../../domain/repository/group-code.repository.interface';
import { CommonCodeEntity } from '../../domain/entity/common-code.entity';
import { GroupCodeEntity } from '../../domain/entity/group-code.entity';

@Injectable()
export class CommonCodeService {
    constructor(
        @Inject('ICommonCodeRepository') private readonly commonCodeRepository: ICommonCodeRepository,
        @Inject('IGroupCodeRepository') private readonly groupCodeRepository: IGroupCodeRepository,
    ) { }

    async getCodesByGroup(groupCode: string): Promise<CommonCodeEntity[]> {
        return this.commonCodeRepository.findAll(groupCode);
    }

    async getGroupInfo(groupCode: string): Promise<GroupCodeEntity | null> {
        return this.groupCodeRepository.findByGroupCode(groupCode);
    }
}
