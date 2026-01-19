import { Module } from '@nestjs/common';
import { UserController } from '../presentation/controller/user.controller';
import { UserService } from '../application/service/user.service';
import { UserRepository } from '../infrastructure/persistence/adapter/user.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [UserController],
    providers: [
        UserService,
        {
            provide: 'IUsersRepository',
            useClass: UserRepository,
        },
    ],
    exports: [UserService],
})
export class UsersModule { }
