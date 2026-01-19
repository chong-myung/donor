import { Module } from '@nestjs/common';
import { CommonCodeController } from '../presentation/controller/common-code.controller';
import { CommonCodeService } from '../application/service/common-code.service';
import { CommonCodeRepository } from '../infrastructure/persistence/adapter/common-code.repository';
import { GroupCodeRepository } from '../infrastructure/persistence/adapter/group-code.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CommonCodeController],
    providers: [
        CommonCodeService,
        {
            provide: 'ICommonCodeRepository',
            useClass: CommonCodeRepository,
        },
        {
            provide: 'IGroupCodeRepository',
            useClass: GroupCodeRepository,
        },
    ],
    exports: [CommonCodeService],
})
export class CommonCodeModule { }
