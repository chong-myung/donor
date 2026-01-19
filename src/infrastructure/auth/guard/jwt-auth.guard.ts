import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    // 1. 요청을 거를지 말지 결정 (Override)
    canActivate(context: ExecutionContext) {
        // @Public() 데코레이터가 붙어있는지 확인
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Public이면 검증 없이 통과 (true)
        if (isPublic) {
            return true;
        }

        // Public이 아니면 부모(AuthGuard)의 로직 수행 -> JwtStrategy 실행됨
        return super.canActivate(context);
    }

    // 2. 에러 핸들링 (작성하셨던 로직을 여기로 이동)
    handleRequest(err, user, info) {
        if (err || !user) {
            if (info?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('토큰이 만료되었습니다.');
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('유효하지 않은 토큰입니다. (변조됨)');
            }
            throw err || new UnauthorizedException();
        }
        return user;
    }
}