# Phase 1: Organization CRUD (기관 입점)

## 목표

기관(Organization)의 CRUD 기능을 완성한다. Repository → Service → Controller → Module 순으로 구현하여 기관 입점 신청, 조회, 수정, 삭제 API를 제공한다.

## 선행 조건

- **Phase 0 완료**: Prisma 스키마에 Organization.userId/planType/status 필드 추가됨
- OrganizationEntity에 새 필드(userId, planType, status) 반영됨
- `@Roles()` 데코레이터와 RolesGuard 사용 가능

## 현재 상태

| 항목 | 상태 |
|------|------|
| `IOrganizationsRepository` 인터페이스 | 존재 (domain layer) |
| OrganizationRepository (Prisma 구현체) | 미구현 |
| OrganizationService | 미구현 |
| OrganizationController | 미구현 |
| OrganizationsModule | 미구현 |

## Task 목록

---

### Task 1-1: OrganizationRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/organization.repository.ts`

**Step 1: 테스트 작성**

`src/application/service/organization.service.spec.ts` (Task 1-2에서 생성하지만, 리포지토리의 mapToEntity 로직은 통합 테스트로 확인):

여기서는 리포지토리 구현만 작성.

**Step 2: OrganizationRepository 구현**

`src/infrastructure/persistence/adapter/organization.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationEntity } from '../../../domain/entity/organization.entity';
import { IOrganizationsRepository } from '../../../domain/repository/organizations.repository.interface';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../../../application/dto/organization.dto';

@Injectable()
export class OrganizationRepository implements IOrganizationsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(): Promise<OrganizationEntity[]> {
        const orgs = await this.prisma.organization.findMany({
            orderBy: [
                { planType: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        return orgs.map(this.mapToEntity);
    }

    async findById(id: number): Promise<OrganizationEntity | null> {
        const org = await this.prisma.organization.findUnique({
            where: { orgId: id },
        });
        return org ? this.mapToEntity(org) : null;
    }

    async findByWalletAddress(walletAddress: string): Promise<OrganizationEntity | null> {
        const org = await this.prisma.organization.findUnique({
            where: { walletAddress },
        });
        return org ? this.mapToEntity(org) : null;
    }

    async create(data: CreateOrganizationDTO): Promise<OrganizationEntity> {
        const org = await this.prisma.organization.create({
            data: {
                name: data.name,
                registrationNumber: data.registrationNumber,
                walletAddress: data.walletAddress,
                contactInfo: data.contactInfo,
                userId: data.userId,
                planType: data.planType ?? 'FREE',
                status: data.status ?? 'PENDING',
            },
        });
        return this.mapToEntity(org);
    }

    async update(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity | null> {
        try {
            const org = await this.prisma.organization.update({
                where: { orgId: id },
                data: {
                    name: data.name,
                    registrationNumber: data.registrationNumber,
                    walletAddress: data.walletAddress,
                    contactInfo: data.contactInfo,
                    planType: data.planType,
                    status: data.status,
                },
            });
            return this.mapToEntity(org);
        } catch {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.organization.delete({
                where: { orgId: id },
            });
            return true;
        } catch {
            return false;
        }
    }

    private mapToEntity(data: any): OrganizationEntity {
        return new OrganizationEntity(
            data.orgId,
            data.name,
            data.registrationNumber,
            data.walletAddress,
            data.contactInfo,
            data.createdAt,
            data.userId,
            data.planType ?? 'FREE',
            data.status ?? 'PENDING'
        );
    }
}
```

**Step 3: 커밋**

```bash
git add src/infrastructure/persistence/adapter/organization.repository.ts
git commit -m "Feature: OrganizationRepository Prisma 구현"
```

---

### Task 1-2: OrganizationService 구현 + 테스트

**Files:**
- Create: `src/application/service/organization.service.ts`
- Create: `src/application/service/organization.service.spec.ts`

**Step 1: 테스트 작성**

`src/application/service/organization.service.spec.ts`:

```typescript
import { OrganizationService } from './organization.service';
import { IOrganizationsRepository } from '../../domain/repository/organizations.repository.interface';
import { OrganizationEntity } from '../../domain/entity/organization.entity';

const mockOrganizationsRepository: jest.Mocked<IOrganizationsRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByWalletAddress: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

describe('OrganizationService', () => {
    let service: OrganizationService;

    beforeEach(() => {
        service = new OrganizationService(mockOrganizationsRepository);
        jest.clearAllMocks();
    });

    describe('createOrganization', () => {
        it('should create organization with default FREE plan and PENDING status', async () => {
            const dto = { name: 'Test Org', walletAddress: 'rWallet123' };
            const entity = new OrganizationEntity(1, 'Test Org', null, 'rWallet123', null, new Date(), null, 'FREE', 'PENDING');
            mockOrganizationsRepository.create.mockResolvedValue(entity);

            const result = await service.createOrganization(dto);

            expect(mockOrganizationsRepository.create).toHaveBeenCalledWith(dto);
            expect(result.planType).toBe('FREE');
        });
    });

    describe('getOrganizationById', () => {
        it('should return organization if found', async () => {
            const entity = new OrganizationEntity(1, 'Test Org', null, 'rWallet', null, new Date(), null, 'FREE', 'APPROVED');
            mockOrganizationsRepository.findById.mockResolvedValue(entity);

            const result = await service.getOrganizationById(1);
            expect(result).toEqual(entity);
        });

        it('should throw if organization not found', async () => {
            mockOrganizationsRepository.findById.mockResolvedValue(null);
            await expect(service.getOrganizationById(999)).rejects.toThrow('Organization not found');
        });
    });

    describe('deleteOrganization', () => {
        it('should delete organization', async () => {
            mockOrganizationsRepository.delete.mockResolvedValue(true);
            await expect(service.deleteOrganization(1)).resolves.not.toThrow();
        });

        it('should throw if delete fails', async () => {
            mockOrganizationsRepository.delete.mockResolvedValue(false);
            await expect(service.deleteOrganization(1)).rejects.toThrow();
        });
    });
});
```

**Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- --testPathPattern=organization.service.spec`
Expected: FAIL — `Cannot find module './organization.service'`

**Step 3: OrganizationService 구현**

`src/application/service/organization.service.ts`:

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationsService } from './organizations.service.interface';
import { IOrganizationsRepository } from '../../domain/repository/organizations.repository.interface';
import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto/organization.dto';

@Injectable()
export class OrganizationService implements IOrganizationsService {
    constructor(
        @Inject('IOrganizationsRepository') private readonly orgRepository: IOrganizationsRepository
    ) {}

    async getAllOrganizations(): Promise<OrganizationEntity[]> {
        return this.orgRepository.findAll();
    }

    async getOrganizationById(id: number): Promise<OrganizationEntity> {
        const org = await this.orgRepository.findById(id);
        if (!org) {
            throw new NotFoundException('Organization not found');
        }
        return org;
    }

    async createOrganization(data: CreateOrganizationDTO): Promise<OrganizationEntity> {
        return this.orgRepository.create(data);
    }

    async updateOrganization(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity> {
        const updated = await this.orgRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Organization not found or update failed');
        }
        return updated;
    }

    async updateWallet(id: number, walletAddress: string): Promise<OrganizationEntity> {
        const updated = await this.orgRepository.update(id, { walletAddress });
        if (!updated) {
            throw new NotFoundException('Organization not found');
        }
        return updated;
    }

    async deleteOrganization(id: number): Promise<void> {
        const deleted = await this.orgRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Organization not found or delete failed');
        }
    }
}
```

**Step 4: 테스트 실행 (성공 확인)**

Run: `npm test -- --testPathPattern=organization.service.spec`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/application/service/organization.service.ts src/application/service/organization.service.spec.ts
git commit -m "Feature: OrganizationService 구현 및 테스트"
```

---

### Task 1-3: OrganizationController 구현

**Files:**
- Create: `src/presentation/controller/organization.controller.ts`

**Step 1: 컨트롤러 작성**

`src/presentation/controller/organization.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpStatus, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { OrganizationService } from '../../application/service/organization.service';
import { CreateOrganizationRequestDTO, UpdateOrganizationRequestDTO, UpdateWalletRequestDTO } from '../../application/dto/organization.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) {}

    @Get()
    @Public()
    @ApiOperation({ summary: '기관 리스트 조회' })
    async getOrganizations(@Res() res: Response) {
        const organizations = await this.organizationService.getAllOrganizations();
        res.status(HttpStatus.OK).json({
            success: true,
            data: organizations.map(org => org.toJSON()),
        });
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: '기관 상세 조회' })
    async getOrganizationById(@Param('id') id: string, @Res() res: Response) {
        const organization = await this.organizationService.getOrganizationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: organization.toJSON(),
        });
    }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 등록 (입점 신청)' })
    async createOrganization(
        @Body() dto: CreateOrganizationRequestDTO,
        @Req() req: any,
        @Res() res: Response
    ) {
        const organization = await this.organizationService.createOrganization({
            ...dto,
            userId: req.user.userId,
        });
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: organization.toJSON(),
        });
    }

    @Patch(':id')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 프로필 수정' })
    async updateOrganization(
        @Param('id') id: string,
        @Body() dto: UpdateOrganizationRequestDTO,
        @Res() res: Response
    ) {
        const organization = await this.organizationService.updateOrganization(Number(id), dto);
        res.status(HttpStatus.OK).json({
            success: true,
            data: organization.toJSON(),
        });
    }

    @Patch(':id/wallet')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 지갑 등록/변경' })
    async updateWallet(
        @Param('id') id: string,
        @Body() dto: UpdateWalletRequestDTO,
        @Res() res: Response
    ) {
        const organization = await this.organizationService.updateWallet(Number(id), dto.walletAddress);
        res.status(HttpStatus.OK).json({
            success: true,
            data: organization.toJSON(),
        });
    }

    @Delete(':id')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 삭제 (관리자 전용)' })
    async deleteOrganization(@Param('id') id: string, @Res() res: Response) {
        await this.organizationService.deleteOrganization(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: null,
        });
    }
}
```

**Step 2: 커밋**

```bash
git add src/presentation/controller/organization.controller.ts
git commit -m "Feature: OrganizationController 구현"
```

---

### Task 1-4: OrganizationsModule 생성 + AppModule 등록

**Files:**
- Create: `src/modules/organizations.module.ts`
- Modify: `src/app.module.ts`

**Step 1: 모듈 작성**

`src/modules/organizations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { OrganizationController } from '../presentation/controller/organization.controller';
import { OrganizationService } from '../application/service/organization.service';
import { OrganizationRepository } from '../infrastructure/persistence/adapter/organization.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OrganizationController],
    providers: [
        OrganizationService,
        {
            provide: 'IOrganizationsRepository',
            useClass: OrganizationRepository,
        },
    ],
    exports: [OrganizationService],
})
export class OrganizationsModule {}
```

**Step 2: AppModule에 import 추가**

`src/app.module.ts`의 imports 배열에 `OrganizationsModule` 추가:

```typescript
import { OrganizationsModule } from './modules/organizations.module';

imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    ProjectsModule,
    AuthModule,
    CommonCodeModule,
    OrganizationsModule,
],
```

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add src/modules/organizations.module.ts src/app.module.ts
git commit -m "Feature: OrganizationsModule 생성 및 AppModule 등록"
```

## 검증 방법

- [ ] `npm test -- --testPathPattern=organization.service.spec` — 테스트 통과
- [ ] `npm run build` — 빌드 성공
- [ ] Swagger (`/api-docs`)에 Organizations 태그 노출
- [ ] `GET /api/organizations` — 기관 리스트 조회 (Public)
- [ ] `POST /api/organizations` — 기관 등록 (인증 필요)
- [ ] `PATCH /api/organizations/:id` — 기관 수정 (ORG_ADMIN/PLATFORM_ADMIN)
- [ ] `DELETE /api/organizations/:id` — 기관 삭제 (PLATFORM_ADMIN)
