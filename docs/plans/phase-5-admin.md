# Phase 5: 관리자 & 정산

## 목표

플랫폼 관리자(PLATFORM_ADMIN)용 기능을 구현한다. 기관 승인/정지, 전체 기부 내역 조회 등 관리자 API를 제공한다.

## 선행 조건

- **Phase 0 완료**: `@Roles('PLATFORM_ADMIN')` 데코레이터 사용 가능
- **Phase 1 완료**: OrganizationService (기관 상태 변경에 사용)
- **Phase 3 완료**: DonationService (전체 기부 내역 조회에 사용)

## 현재 상태

| 항목 | 상태 |
|------|------|
| AdminController | 미구현 |
| AdminModule | 미구현 |
| 기관 승인/정지 로직 | OrganizationService.updateOrganization()으로 처리 가능 |

## Task 목록

---

### Task 5-1: AdminController 구현

**Files:**
- Create: `src/presentation/controller/admin.controller.ts`
- Create: `src/modules/admin.module.ts`
- Modify: `src/app.module.ts`

**Step 1: AdminController 작성**

`src/presentation/controller/admin.controller.ts`:

```typescript
import { Controller, Get, Patch, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth()
@Roles('PLATFORM_ADMIN')
export class AdminController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

    @Get('organizations')
    @ApiOperation({ summary: '기관 리스트 (관리자)' })
    async getOrganizations(@Query('status') status: string, @Res() res: Response) {
        const orgs = await this.organizationService.getAllOrganizations();
        const filtered = status ? orgs.filter(o => o.status === status) : orgs;
        res.status(HttpStatus.OK).json({
            success: true,
            data: filtered.map(o => o.toJSON()),
        });
    }

    @Patch('organizations/:id/approve')
    @ApiOperation({ summary: '기관 승인' })
    async approveOrganization(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.updateOrganization(Number(id), { status: 'APPROVED' });
        res.status(HttpStatus.OK).json({ success: true, data: org.toJSON() });
    }

    @Patch('organizations/:id/suspend')
    @ApiOperation({ summary: '기관 정지' })
    async suspendOrganization(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.updateOrganization(Number(id), { status: 'SUSPENDED' });
        res.status(HttpStatus.OK).json({ success: true, data: org.toJSON() });
    }

    @Get('donations')
    @ApiOperation({ summary: '전체 기부 내역 (관리자)' })
    async getAllDonations(@Query() filter: any, @Res() res: Response) {
        const donations = await this.donationService.getAllDonations(filter);
        res.status(HttpStatus.OK).json({
            success: true,
            data: donations.map(d => d.toJSON()),
        });
    }
}
```

**Step 2: AdminModule 작성**

`src/modules/admin.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from '../presentation/controller/admin.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';

@Module({
    imports: [OrganizationsModule, DonationsModule],
    controllers: [AdminController],
})
export class AdminModule {}
```

**Step 3: AppModule에 AdminModule 추가**

`src/app.module.ts`의 imports에 `AdminModule` 추가.

**Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 5: 커밋**

```bash
git add src/presentation/controller/admin.controller.ts src/modules/admin.module.ts src/app.module.ts
git commit -m "Feature: AdminController + AdminModule 구현"
```

## 검증 방법

- [ ] `npm run build` — 빌드 성공
- [ ] Swagger (`/api-docs`)에 Admin 태그 노출
- [ ] `GET /api/admin/organizations` — 기관 리스트 (PLATFORM_ADMIN 전용)
- [ ] `GET /api/admin/organizations?status=PENDING` — 상태별 필터링
- [ ] `PATCH /api/admin/organizations/:id/approve` — 기관 승인
- [ ] `PATCH /api/admin/organizations/:id/suspend` — 기관 정지
- [ ] `GET /api/admin/donations` — 전체 기부 내역 (PLATFORM_ADMIN 전용)
- [ ] 비관리자 사용자 접근 시 403 Forbidden 응답
