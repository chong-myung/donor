# Phase 4: 마이페이지 & 사용자 상호작용

## 목표

기부자와 기관 관리자의 마이페이지 기능을 구현한다. 좋아요(FavoriteProject) 기능, 기부자 마이페이지(내 기부 내역, 좋아요 목록, 프로필), 기관 마이페이지(대시보드, 플랜 관리)를 제공한다.

## 선행 조건

- **Phase 1 완료**: OrganizationService (기관 마이페이지에서 사용)
- **Phase 3 완료**: DonationService (기부 내역 조회에 사용)
- UserService 사용 가능 (기존 구현)

## 현재 상태

| 항목 | 상태 |
|------|------|
| `IFavoriteProjectsRepository` 인터페이스 | 존재 (domain layer) |
| FavoriteProjectRepository (Prisma 구현체) | 미구현 |
| FavoriteProjectEntity | 존재 (domain layer) |
| 기부자 마이페이지 컨트롤러 | 미구현 |
| 기관 마이페이지 컨트롤러 | 미구현 |
| FavoritesModule | 미구현 |
| MypageModule | 미구현 |

## Task 목록

---

### Task 4-1: FavoriteProjectRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/favorite-project.repository.ts`

**Step 1: 리포지토리 구현**

`src/infrastructure/persistence/adapter/favorite-project.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FavoriteProjectEntity } from '../../../domain/entity/favorite-project.entity';
import { IFavoriteProjectsRepository } from '../../../domain/repository/favorite-projects.repository.interface';
import { CreateFavoriteProjectDTO, FavoriteProjectFilterDTO } from '../../../application/dto/favorite-project.dto';

@Injectable()
export class FavoriteProjectRepository implements IFavoriteProjectsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(filter?: FavoriteProjectFilterDTO): Promise<FavoriteProjectEntity[]> {
        const where: any = {};
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.projectId) where.projectId = filter.projectId;

        const favorites = await this.prisma.favoriteProject.findMany({
            where,
            orderBy: { favoritedAt: 'desc' },
        });
        return favorites.map(this.mapToEntity);
    }

    async findByUser(userId: number): Promise<FavoriteProjectEntity[]> {
        const favorites = await this.prisma.favoriteProject.findMany({
            where: { userId },
            orderBy: { favoritedAt: 'desc' },
        });
        return favorites.map(this.mapToEntity);
    }

    async findByUserAndProject(userId: number, projectId: number): Promise<FavoriteProjectEntity | null> {
        const favorite = await this.prisma.favoriteProject.findUnique({
            where: { userId_projectId: { userId, projectId } },
        });
        return favorite ? this.mapToEntity(favorite) : null;
    }

    async create(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity> {
        const favorite = await this.prisma.favoriteProject.create({
            data: { userId: data.userId, projectId: data.projectId },
        });
        return this.mapToEntity(favorite);
    }

    async delete(userId: number, projectId: number): Promise<boolean> {
        try {
            await this.prisma.favoriteProject.delete({
                where: { userId_projectId: { userId, projectId } },
            });
            return true;
        } catch {
            return false;
        }
    }

    async exists(userId: number, projectId: number): Promise<boolean> {
        const count = await this.prisma.favoriteProject.count({
            where: { userId, projectId },
        });
        return count > 0;
    }

    private mapToEntity(data: any): FavoriteProjectEntity {
        return FavoriteProjectEntity.create({
            userId: data.userId,
            projectId: data.projectId,
            favoritedAt: data.favoritedAt,
        });
    }
}
```

**Step 2: 커밋**

```bash
git add src/infrastructure/persistence/adapter/favorite-project.repository.ts
git commit -m "Feature: FavoriteProjectRepository Prisma 구현"
```

---

### Task 4-2: 마이페이지 컨트롤러 (기부자 + 기관)

**Files:**
- Create: `src/presentation/controller/mypage-donor.controller.ts`
- Create: `src/presentation/controller/mypage-org.controller.ts`

**Step 1: 기부자 마이페이지 컨트롤러**

`src/presentation/controller/mypage-donor.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, HttpStatus, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { DonationService } from '../../application/service/donation.service';
import { UserService } from '../../application/service/user.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { IFavoriteProjectsRepository } from '../../domain/repository/favorite-projects.repository.interface';
import { Inject } from '@nestjs/common';

@ApiTags('MyPage - Donor')
@Controller('me')
@ApiBearerAuth()
export class MypageDonorController {
    constructor(
        private readonly donationService: DonationService,
        private readonly userService: UserService,
        @Inject('IFavoriteProjectsRepository') private readonly favoriteRepo: IFavoriteProjectsRepository,
    ) {}

    @Get('donations')
    @ApiOperation({ summary: '내 기부 내역' })
    async getMyDonations(@Req() req: any, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByUser(req.user.userId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: donations.map(d => d.toJSON()),
        });
    }

    @Get('favorites')
    @ApiOperation({ summary: '좋아요 캠페인 리스트' })
    async getMyFavorites(@Req() req: any, @Res() res: Response) {
        const favorites = await this.favoriteRepo.findByUser(req.user.userId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: favorites.map(f => f.toJSON()),
        });
    }

    @Post('favorites/:projectId')
    @ApiOperation({ summary: '좋아요 추가' })
    async addFavorite(@Param('projectId') projectId: string, @Req() req: any, @Res() res: Response) {
        const favorite = await this.favoriteRepo.create({
            userId: req.user.userId,
            projectId: Number(projectId),
        });
        res.status(HttpStatus.CREATED).json({ success: true, data: favorite.toJSON() });
    }

    @Delete('favorites/:projectId')
    @ApiOperation({ summary: '좋아요 삭제' })
    async removeFavorite(@Param('projectId') projectId: string, @Req() req: any, @Res() res: Response) {
        await this.favoriteRepo.delete(req.user.userId, Number(projectId));
        res.status(HttpStatus.OK).json({ success: true, data: null });
    }

    @Get('profile')
    @ApiOperation({ summary: '내 계정 정보' })
    async getMyProfile(@Req() req: any, @Res() res: Response) {
        const user = await this.userService.info(req.user.userId);
        res.status(HttpStatus.OK).json({ success: true, data: user });
    }
}
```

**Step 2: 기관 마이페이지 컨트롤러**

`src/presentation/controller/mypage-org.controller.ts`:

```typescript
import { Controller, Get, Patch, Post, Body, HttpStatus, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('MyPage - Organization')
@Controller('org')
@ApiBearerAuth()
@Roles('ORG_ADMIN')
export class MypageOrgController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

    @Get('dashboard')
    @ApiOperation({ summary: '기관 대시보드' })
    async getDashboard(@Req() req: any, @Res() res: Response) {
        // userId로 연결된 Organization 조회
        // 간소화: orgId를 query 또는 user에서 가져옴
        res.status(HttpStatus.OK).json({
            success: true,
            data: { message: 'Dashboard - implement with org data' },
        });
    }

    @Get('plan')
    @ApiOperation({ summary: '현재 플랜 정보' })
    async getPlan(@Req() req: any, @Res() res: Response) {
        res.status(HttpStatus.OK).json({
            success: true,
            data: { message: 'Plan info - implement with org planType' },
        });
    }

    @Post('plan/upgrade')
    @ApiOperation({ summary: 'Plus 플랜 업그레이드 (Mock)' })
    async upgradePlan(@Req() req: any, @Res() res: Response) {
        res.status(HttpStatus.OK).json({
            success: true,
            data: { message: 'Plan upgraded to PLUS (mock)' },
        });
    }

    @Post('plan/cancel')
    @ApiOperation({ summary: 'Plus 플랜 구독 해지' })
    async cancelPlan(@Req() req: any, @Res() res: Response) {
        res.status(HttpStatus.OK).json({
            success: true,
            data: { message: 'Plan downgraded to FREE (mock)' },
        });
    }
}
```

**Step 3: 커밋**

```bash
git add src/presentation/controller/mypage-donor.controller.ts src/presentation/controller/mypage-org.controller.ts
git commit -m "Feature: 기부자/기관 마이페이지 컨트롤러 구현"
```

---

### Task 4-3: FavoritesModule + MypageModule 생성 + AppModule 등록

**Files:**
- Create: `src/modules/favorites.module.ts`
- Create: `src/modules/mypage.module.ts`
- Modify: `src/app.module.ts`

**Step 1: FavoritesModule**

`src/modules/favorites.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { FavoriteProjectRepository } from '../infrastructure/persistence/adapter/favorite-project.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: 'IFavoriteProjectsRepository',
            useClass: FavoriteProjectRepository,
        },
    ],
    exports: ['IFavoriteProjectsRepository'],
})
export class FavoritesModule {}
```

**Step 2: MypageModule**

`src/modules/mypage.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MypageDonorController } from '../presentation/controller/mypage-donor.controller';
import { MypageOrgController } from '../presentation/controller/mypage-org.controller';
import { DonationsModule } from './donations.module';
import { UsersModule } from './users.module';
import { OrganizationsModule } from './organizations.module';
import { FavoritesModule } from './favorites.module';

@Module({
    imports: [DonationsModule, UsersModule, OrganizationsModule, FavoritesModule],
    controllers: [MypageDonorController, MypageOrgController],
})
export class MypageModule {}
```

**Step 3: AppModule에 MypageModule 추가**

`src/app.module.ts`의 imports에 `MypageModule` 추가.

**Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 5: 커밋**

```bash
git add src/modules/favorites.module.ts src/modules/mypage.module.ts src/app.module.ts
git commit -m "Feature: FavoritesModule + MypageModule 생성 및 등록"
```

## 검증 방법

- [ ] `npm run build` — 빌드 성공
- [ ] Swagger (`/api-docs`)에 MyPage - Donor, MyPage - Organization 태그 노출
- [ ] `GET /api/me/donations` — 내 기부 내역 (인증 필요)
- [ ] `GET /api/me/favorites` — 좋아요 목록 (인증 필요)
- [ ] `POST /api/me/favorites/:projectId` — 좋아요 추가
- [ ] `DELETE /api/me/favorites/:projectId` — 좋아요 삭제
- [ ] `GET /api/me/profile` — 내 프로필 조회
- [ ] `GET /api/org/dashboard` — 기관 대시보드 (ORG_ADMIN 전용)
- [ ] `POST /api/org/plan/upgrade` — 플랜 업그레이드 (Mock)
