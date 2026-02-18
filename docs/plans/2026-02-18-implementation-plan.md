# Donor 백엔드 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 크립토 기부 플랫폼 Donor의 백엔드 API를 Phase 0~6까지 단계적으로 구현한다.

**Architecture:** NestJS Clean/Hexagonal Architecture. 도메인 레이어(엔티티/리포지토리 인터페이스)는 프레임워크 무관, 인프라 레이어(Prisma 구현체)에서 실제 DB 접근, 프레젠테이션 레이어(컨트롤러)에서 HTTP 처리. DI는 string token 기반.

**Tech Stack:** TypeScript 5.9, NestJS 11, Prisma 7 + MySQL 8.0, Passport (JWT+Google OAuth2), class-validator, Swagger, Jest

---

## Phase 0: 스키마 확장 & 공통 인프라

---

### Task 0-1: Prisma 스키마에 role, planType, orgStatus 필드 추가

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: User 모델에 role 필드 추가**

`prisma/schema.prisma`의 User 모델에 아래 필드를 추가한다:

```prisma
model User {
  // ... 기존 필드 유지
  role          String   @default("DONOR") @map("role") @db.VarChar(20)
  // ... 기존 relations 유지
}
```

**Step 2: Organization 모델에 planType, status, userId 필드 추가**

```prisma
model Organization {
  // ... 기존 필드 유지
  userId             Int?     @unique @map("user_id")
  planType           String   @default("FREE") @map("plan_type") @db.VarChar(10)
  status             String   @default("PENDING") @map("status") @db.VarChar(20)

  user     User?     @relation(fields: [userId], references: [userId])
  projects Project[]

  @@map("organizations")
}
```

User 모델에도 Organization relation 추가:
```prisma
model User {
  // ...
  organization     Organization?
}
```

**Step 3: 마이그레이션 실행**

Run: `npx prisma migrate dev --name add-role-plan-status`
Expected: Migration 성공, 새 컬럼 추가됨

**Step 4: Prisma Client 재생성**

Run: `npx prisma generate`
Expected: `src/generated/prisma/` 업데이트

**Step 5: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "Feature: User role, Organization planType/status/userId 필드 추가"
```

---

### Task 0-2: Role/PlanType/OrgStatus enum 추가

**Files:**
- Create: `src/domain/enums/user-role.enum.ts`
- Create: `src/domain/enums/plan-type.enum.ts`
- Create: `src/domain/enums/org-status.enum.ts`

**Step 1: enum 파일 작성**

`src/domain/enums/user-role.enum.ts`:
```typescript
export enum UserRole {
  DONOR = 'DONOR',
  ORG_ADMIN = 'ORG_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}
```

`src/domain/enums/plan-type.enum.ts`:
```typescript
export enum PlanType {
  FREE = 'FREE',
  PLUS = 'PLUS',
}
```

`src/domain/enums/org-status.enum.ts`:
```typescript
export enum OrgStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
}
```

**Step 2: 커밋**

```bash
git add src/domain/enums/
git commit -m "Feature: UserRole, PlanType, OrgStatus enum 추가"
```

---

### Task 0-3: UserEntity에 role 필드 반영

**Files:**
- Modify: `src/domain/entity/user.entity.ts`
- Modify: `src/application/dto/user.dto.ts`

**Step 1: UserEntity 수정**

`src/domain/entity/user.entity.ts` — constructor, `create()`, `toJSON()`, `toPublicJSON()`에 `role` 추가:

```typescript
export class UserEntity {
    constructor(
      public readonly userId: number,
      public readonly email: string,
      public readonly passwordHash: string | null,
      public readonly loginPlatform: string,
      public readonly walletAddress: string | null,
      public readonly isActive: boolean,
      public readonly createdAt: Date,
      public readonly role: string = 'DONOR'
    ) {}

    static create(data: {
      userId: number;
      email: string;
      passwordHash?: string | null;
      loginPlatform: string;
      walletAddress?: string | null;
      isActive?: boolean;
      createdAt?: Date;
      role?: string;
    }): UserEntity {
      return new UserEntity(
        data.userId,
        data.email,
        data.passwordHash ?? null,
        data.loginPlatform,
        data.walletAddress ?? null,
        data.isActive ?? true,
        data.createdAt ?? new Date(),
        data.role ?? 'DONOR'
      );
    }

    toJSON() {
      return {
        userId: this.userId,
        email: this.email,
        loginPlatform: this.loginPlatform,
        walletAddress: this.walletAddress,
        isActive: this.isActive,
        createdAt: this.createdAt,
        role: this.role,
      };
    }

    toPublicJSON() {
      return {
        userId: this.userId,
        email: this.email,
        loginPlatform: this.loginPlatform,
        isActive: this.isActive,
        createdAt: this.createdAt,
        role: this.role,
      };
    }
}
```

**Step 2: UserRepository mapToEntity 수정**

`src/infrastructure/persistence/adapter/user.repository.ts` — `mapToEntity`에 `role` 추가:

```typescript
private mapToEntity(data: any): UserEntity {
    return new UserEntity(
        data.userId,
        data.email,
        data.passwordHash,
        data.loginPlatform,
        data.walletAddress,
        data.isActive ?? true,
        data.createdAt,
        data.role ?? 'DONOR'
    );
}
```

**Step 3: CreateUserDTO에 role 추가**

`src/application/dto/user.dto.ts`:
```typescript
export interface CreateUserDTO {
  email: string;
  passwordHash?: string | null;
  loginPlatform: string;
  walletAddress?: string | null;
  isActive?: boolean;
  role?: string;
}
```

**Step 4: 기존 테스트 수정**

`src/application/service/user.service.spec.ts` — UserEntity 생성자 호출에 `role` 파라미터 추가:

```typescript
const createdUser = new UserEntity(
    1,
    createUserDto.email,
    hashedPassword,
    createUserDto.loginPlatform,
    null,
    true,
    new Date(),
    'DONOR'
);
```

모든 `new UserEntity(...)` 호출에 8번째 인자로 `'DONOR'` 추가.

**Step 5: 테스트 실행**

Run: `npm test`
Expected: PASS

**Step 6: 커밋**

```bash
git add src/domain/entity/user.entity.ts src/infrastructure/persistence/adapter/user.repository.ts src/application/dto/user.dto.ts src/application/service/user.service.spec.ts
git commit -m "Feature: UserEntity에 role 필드 추가"
```

---

### Task 0-4: OrganizationEntity에 planType, status, userId 필드 반영

**Files:**
- Modify: `src/domain/entity/organization.entity.ts`
- Modify: `src/application/dto/organization.dto.ts`

**Step 1: OrganizationEntity 수정**

`src/domain/entity/organization.entity.ts`:

```typescript
export class OrganizationEntity {
    constructor(
      public readonly orgId: number,
      public readonly name: string,
      public readonly registrationNumber: string | null,
      public readonly walletAddress: string,
      public readonly contactInfo: string | null,
      public readonly createdAt: Date,
      public readonly userId: number | null = null,
      public readonly planType: string = 'FREE',
      public readonly status: string = 'PENDING'
    ) {}

    static create(data: {
      orgId: number;
      name: string;
      registrationNumber?: string | null;
      walletAddress: string;
      contactInfo?: string | null;
      createdAt?: Date;
      userId?: number | null;
      planType?: string;
      status?: string;
    }): OrganizationEntity {
      return new OrganizationEntity(
        data.orgId,
        data.name,
        data.registrationNumber ?? null,
        data.walletAddress,
        data.contactInfo ?? null,
        data.createdAt ?? new Date(),
        data.userId ?? null,
        data.planType ?? 'FREE',
        data.status ?? 'PENDING'
      );
    }

    toJSON() {
      return {
        orgId: this.orgId,
        name: this.name,
        registrationNumber: this.registrationNumber,
        walletAddress: this.walletAddress,
        contactInfo: this.contactInfo,
        createdAt: this.createdAt,
        userId: this.userId,
        planType: this.planType,
        status: this.status,
      };
    }

    isPlusPlan(): boolean {
      return this.planType === 'PLUS';
    }

    isApproved(): boolean {
      return this.status === 'APPROVED';
    }
}
```

**Step 2: DTO 수정**

`src/application/dto/organization.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface CreateOrganizationDTO {
  name: string;
  registrationNumber?: string | null;
  walletAddress: string;
  contactInfo?: string | null;
  userId?: number | null;
  planType?: string;
  status?: string;
}

export interface UpdateOrganizationDTO {
  name?: string;
  registrationNumber?: string | null;
  walletAddress?: string;
  contactInfo?: string | null;
  planType?: string;
  status?: string;
}

export class CreateOrganizationRequestDTO {
  @ApiProperty({ example: 'Save the Children' })
  name: string;

  @ApiPropertyOptional({ example: '123-45-67890' })
  registrationNumber?: string;

  @ApiProperty({ example: 'rXRPL...' })
  walletAddress: string;

  @ApiPropertyOptional({ example: '{"email":"contact@org.com","phone":"+1234567890"}' })
  contactInfo?: string;
}

export class UpdateOrganizationRequestDTO {
  @ApiPropertyOptional({ example: 'Save the Children Updated' })
  name?: string;

  @ApiPropertyOptional({ example: '123-45-67890' })
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'rNewWallet...' })
  walletAddress?: string;

  @ApiPropertyOptional({ example: '{"email":"new@org.com"}' })
  contactInfo?: string;
}

export class UpdateWalletRequestDTO {
  @ApiProperty({ example: 'rNewWallet...' })
  walletAddress: string;
}
```

**Step 3: 커밋**

```bash
git add src/domain/entity/organization.entity.ts src/application/dto/organization.dto.ts
git commit -m "Feature: OrganizationEntity에 userId, planType, status 필드 추가"
```

---

### Task 0-5: Roles 데코레이터 & RolesGuard 생성

**Files:**
- Create: `src/common/decorators/roles.decorator.ts`
- Create: `src/infrastructure/auth/guard/roles.guard.ts`

**Step 1: Roles 데코레이터 작성**

`src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Step 2: RolesGuard 작성**

`src/infrastructure/auth/guard/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user || !user.role) {
            throw new ForbiddenException('접근 권한이 없습니다.');
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException('접근 권한이 없습니다.');
        }

        return true;
    }
}
```

**Step 3: AppModule에 RolesGuard 글로벌 등록**

`src/app.module.ts`의 providers 배열에 추가:

```typescript
import { RolesGuard } from './infrastructure/auth/guard/roles.guard';

providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
],
```

**Step 4: JwtStrategy에서 user payload에 role 포함시키기**

`src/infrastructure/auth/strategy/jwt.strategy.ts`의 `validate` 메서드에서 반환하는 객체에 `role` 필드 포함:

```typescript
async validate(payload: any) {
    return { userId: payload.userId, email: payload.email, role: payload.role };
}
```

AuthService의 `login` 메서드에서 JWT payload에 `role` 포함:

```typescript
const payload = { userId: user.userId, email: user.email, role: user.role };
```

**Step 5: 커밋**

```bash
git add src/common/decorators/roles.decorator.ts src/infrastructure/auth/guard/roles.guard.ts src/app.module.ts src/infrastructure/auth/strategy/jwt.strategy.ts
git commit -m "Feature: Roles 데코레이터 & RolesGuard 추가"
```

---

### Task 0-6: 공통 페이지네이션 DTO 추가

**Files:**
- Create: `src/application/dto/pagination.dto.ts`

**Step 1: 페이지네이션 DTO 작성**

`src/application/dto/pagination.dto.ts`:

```typescript
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDTO {
    @ApiPropertyOptional({ example: 1, description: '페이지 번호 (1부터 시작)' })
    page?: number = 1;

    @ApiPropertyOptional({ example: 20, description: '페이지당 항목 수' })
    limit?: number = 20;

    @ApiPropertyOptional({ example: 'createdAt', description: '정렬 기준 필드' })
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ example: 'desc', description: '정렬 방향 (asc/desc)' })
    sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponseDTO<T> {
    @ApiProperty()
    data: T[];

    @ApiProperty({ example: 100 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 20 })
    limit: number;

    @ApiProperty({ example: 5 })
    totalPages: number;

    constructor(data: T[], total: number, page: number, limit: number) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
    }
}
```

**Step 2: 커밋**

```bash
git add src/application/dto/pagination.dto.ts
git commit -m "Feature: 공통 페이지네이션 DTO 추가"
```

---

## Phase 1: Organization CRUD (기관 입점)

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

---

## Phase 2: Project(Campaign) CRUD

---

### Task 2-1: ProjectRepository 실제 구현

**Files:**
- Modify: `src/infrastructure/persistence/adapter/project.repository.ts`

**Step 1: 스텁 메서드를 실제 Prisma 쿼리로 교체**

`src/infrastructure/persistence/adapter/project.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IProjectsRepository } from '../../../domain/repository/projects.repository.interface';
import { ProjectFilterDTO, CreateProjectDTO, UpdateProjectDTO } from '@/application/dto/project.dto';
import { ProjectEntity } from '@/domain/entity/project.entity';
import { OrganizationEntity } from '@/domain/entity/organization.entity';
import { BeneficiaryEntity } from '@/domain/entity/beneficiary.entity';

@Injectable()
export class ProjectRepository implements IProjectsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(filter?: ProjectFilterDTO): Promise<ProjectEntity[]> {
        const page = filter?.page ?? 1;
        const limit = filter?.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (filter?.nation) where.nation = filter.nation;
        if (filter?.status) where.status = filter.status;
        if (filter?.minGoalAmount || filter?.maxGoalAmount) {
            where.goalAmount = {};
            if (filter.minGoalAmount) where.goalAmount.gte = parseFloat(filter.minGoalAmount);
            if (filter.maxGoalAmount) where.goalAmount.lte = parseFloat(filter.maxGoalAmount);
        }

        const projects = await this.prisma.project.findMany({
            where,
            include: { organization: true, beneficiary: true },
            orderBy: [
                { organization: { planType: 'desc' } },
                { startDate: 'desc' },
            ],
            skip,
            take: limit,
        });

        return projects.map(p => this.mapToEntity(p));
    }

    async findById(id: number): Promise<ProjectEntity | null> {
        const project = await this.prisma.project.findUnique({
            where: { projectId: id },
            include: { organization: true, beneficiary: true },
        });
        return project ? this.mapToEntity(project) : null;
    }

    async findByOrganization(orgId: number): Promise<ProjectEntity[]> {
        const projects = await this.prisma.project.findMany({
            where: { orgId },
            include: { organization: true, beneficiary: true },
            orderBy: { startDate: 'desc' },
        });
        return projects.map(p => this.mapToEntity(p));
    }

    async findByStatus(status: string): Promise<ProjectEntity[]> {
        const projects = await this.prisma.project.findMany({
            where: { status },
            include: { organization: true, beneficiary: true },
        });
        return projects.map(p => this.mapToEntity(p));
    }

    async create(data: CreateProjectDTO): Promise<ProjectEntity> {
        const project = await this.prisma.project.create({
            data: {
                orgId: data.orgId,
                title: data.title,
                nation: 'KR',
                thumbnailUrl: data.thumbnailUrl,
                shortDescription: data.shortDescription,
                detailedDescription: data.detailedDescription,
                goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : null,
                status: data.status,
                startDate: data.startDate,
            },
            include: { organization: true, beneficiary: true },
        });
        return this.mapToEntity(project);
    }

    async update(id: number, data: UpdateProjectDTO): Promise<ProjectEntity | null> {
        try {
            const project = await this.prisma.project.update({
                where: { projectId: id },
                data: {
                    title: data.title,
                    thumbnailUrl: data.thumbnailUrl,
                    shortDescription: data.shortDescription,
                    detailedDescription: data.detailedDescription,
                    goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : undefined,
                    currentRaisedUsdc: data.currentRaisedUsdc ? parseFloat(data.currentRaisedUsdc) : undefined,
                    status: data.status,
                    startDate: data.startDate,
                },
                include: { organization: true, beneficiary: true },
            });
            return this.mapToEntity(project);
        } catch {
            return null;
        }
    }

    async updateRaisedAmount(projectId: number, amount: string): Promise<void> {
        await this.prisma.project.update({
            where: { projectId },
            data: { currentRaisedUsdc: parseFloat(amount) },
        });
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.project.delete({ where: { projectId: id } });
            return true;
        } catch {
            return false;
        }
    }

    private mapToEntity(data: any): ProjectEntity {
        const org = data.organization
            ? new OrganizationEntity(
                data.organization.orgId,
                data.organization.name,
                data.organization.registrationNumber,
                data.organization.walletAddress,
                data.organization.contactInfo,
                data.organization.createdAt,
                data.organization.userId,
                data.organization.planType ?? 'FREE',
                data.organization.status ?? 'PENDING'
              )
            : undefined;

        const beneficiary = data.beneficiary
            ? new (require('@/domain/entity/beneficiary.entity').BeneficiaryEntity)(
                data.beneficiary.beneficiaryId,
                data.beneficiary.name,
                data.beneficiary.bio,
                data.beneficiary.walletAddress,
                data.beneficiary.contactInfo,
                data.beneficiary.isVerified,
                data.beneficiary.createdAt
              )
            : undefined;

        return new ProjectEntity(
            data.projectId,
            data.orgId,
            data.beneficiaryId,
            data.nation,
            data.title,
            data.thumbnailUrl,
            data.shortDescription,
            data.detailedDescription,
            data.goalAmount?.toString() ?? null,
            data.currentRaisedUsdc?.toString() ?? '0.00',
            data.status,
            data.startDate,
            org,
            beneficiary
        );
    }
}
```

> **Note:** `require` 대신 상단에 `import { BeneficiaryEntity } from '@/domain/entity/beneficiary.entity';`를 사용. 위 코드에서 inline require는 피하고 정상 import로 변경한다.

**Step 2: ProjectController에서 @ApiExcludeController 제거 + @Public 추가**

`src/presentation/controller/project.controller.ts`의 `@ApiExcludeController()` 제거, 리스트/상세 조회에 `@Public()` 추가:

```typescript
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Projects')
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    @Get()
    @Public()
    @ApiOperation({ summary: '프로젝트(캠페인) 목록 조회' })
    async getProjectList(@Query() filter: ProjectFilterDTO, @Res() res: Response) {
        // ... 기존 로직
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: '프로젝트(캠페인) 상세 조회' })
    async getProjectById(@Param('id') id: string, @Res() res: Response) {
        // ... 기존 로직
    }

    // ... create는 기존 유지 (인증 필요)
}
```

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add src/infrastructure/persistence/adapter/project.repository.ts src/presentation/controller/project.controller.ts
git commit -m "Feature: ProjectRepository 실제 구현 + 컨트롤러 Swagger 활성화"
```

---

### Task 2-2: ProjectMediaRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/project-media.repository.ts`

**Step 1: 리포지토리 구현**

`src/infrastructure/persistence/adapter/project-media.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectMediaEntity } from '../../../domain/entity/project-media.entity';
import { IProjectMediaRepository } from '../../../domain/repository/project-media.repository.interface';
import { CreateProjectMediaDTO, UpdateProjectMediaDTO } from '../../../application/dto/project-media.dto';

@Injectable()
export class ProjectMediaRepository implements IProjectMediaRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(): Promise<ProjectMediaEntity[]> {
        const media = await this.prisma.projectMedia.findMany();
        return media.map(this.mapToEntity);
    }

    async findById(id: number): Promise<ProjectMediaEntity | null> {
        const media = await this.prisma.projectMedia.findUnique({
            where: { mediaId: id },
        });
        return media ? this.mapToEntity(media) : null;
    }

    async findByProject(projectId: number): Promise<ProjectMediaEntity[]> {
        const media = await this.prisma.projectMedia.findMany({
            where: { projectId },
        });
        return media.map(this.mapToEntity);
    }

    async findByProjectAndContentType(projectId: number, contentType: string): Promise<ProjectMediaEntity[]> {
        const media = await this.prisma.projectMedia.findMany({
            where: { projectId, contentType },
        });
        return media.map(this.mapToEntity);
    }

    async create(data: CreateProjectMediaDTO): Promise<ProjectMediaEntity> {
        const media = await this.prisma.projectMedia.create({
            data: {
                projectId: data.projectId,
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType,
                contentType: data.contentType,
                description: data.description,
            },
        });
        return this.mapToEntity(media);
    }

    async update(id: number, data: UpdateProjectMediaDTO): Promise<ProjectMediaEntity | null> {
        try {
            const media = await this.prisma.projectMedia.update({
                where: { mediaId: id },
                data: {
                    mediaUrl: data.mediaUrl,
                    mediaType: data.mediaType,
                    contentType: data.contentType,
                    description: data.description,
                },
            });
            return this.mapToEntity(media);
        } catch {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.projectMedia.delete({ where: { mediaId: id } });
            return true;
        } catch {
            return false;
        }
    }

    private mapToEntity(data: any): ProjectMediaEntity {
        return ProjectMediaEntity.create({
            mediaId: data.mediaId,
            projectId: data.projectId,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            contentType: data.contentType,
            description: data.description,
            uploadedAt: data.uploadedAt,
        });
    }
}
```

**Step 2: 커밋**

```bash
git add src/infrastructure/persistence/adapter/project-media.repository.ts
git commit -m "Feature: ProjectMediaRepository Prisma 구현"
```

---

### Task 2-3: ProjectMediaModule + ProjectsModule에 media 통합

**Files:**
- Create: `src/modules/project-media.module.ts`
- Modify: `src/modules/projects.module.ts`
- Modify: `src/app.module.ts`

**Step 1: ProjectMediaModule 작성**

`src/modules/project-media.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ProjectMediaRepository } from '../infrastructure/persistence/adapter/project-media.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: 'IProjectMediaRepository',
            useClass: ProjectMediaRepository,
        },
    ],
    exports: ['IProjectMediaRepository'],
})
export class ProjectMediaModule {}
```

**Step 2: AppModule에 ProjectMediaModule 추가**

`src/app.module.ts`의 imports에 `ProjectMediaModule` 추가.

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add src/modules/project-media.module.ts src/app.module.ts
git commit -m "Feature: ProjectMediaModule 생성 및 등록"
```

---

## Phase 3: Donation Flow (기부 핵심)

---

### Task 3-1: DonationRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/donation.repository.ts`

**Step 1: DonationRepository 구현**

`src/infrastructure/persistence/adapter/donation.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DonationEntity } from '../../../domain/entity/donation.entity';
import { IDonationsRepository } from '../../../domain/repository/donations.repository.interface';
import { CreateDonationDTO, UpdateDonationDTO, DonationFilterDTO } from '../../../application/dto/donation.dto';

@Injectable()
export class DonationRepository implements IDonationsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(filter?: DonationFilterDTO): Promise<DonationEntity[]> {
        const where: any = {};
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.projectId) where.projectId = filter.projectId;
        if (filter?.coinType) where.coinType = filter.coinType;
        if (filter?.status) where.status = filter.status;
        if (filter?.isAnonymous !== undefined) where.isAnonymous = filter.isAnonymous;
        if (filter?.startDate || filter?.endDate) {
            where.donationDate = {};
            if (filter.startDate) where.donationDate.gte = filter.startDate;
            if (filter.endDate) where.donationDate.lte = filter.endDate;
        }

        const donations = await this.prisma.donation.findMany({
            where,
            include: { user: true, project: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(d => this.mapToEntity(d));
    }

    async findById(id: number): Promise<DonationEntity | null> {
        const donation = await this.prisma.donation.findUnique({
            where: { donationId: id },
            include: { user: true, project: true },
        });
        return donation ? this.mapToEntity(donation) : null;
    }

    async findByUser(userId: number): Promise<DonationEntity[]> {
        const donations = await this.prisma.donation.findMany({
            where: { userId },
            include: { project: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(d => this.mapToEntity(d));
    }

    async findByProject(projectId: number): Promise<DonationEntity[]> {
        const donations = await this.prisma.donation.findMany({
            where: { projectId },
            include: { user: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(d => this.mapToEntity(d));
    }

    async findByTransactionHash(hash: string): Promise<DonationEntity | null> {
        const donation = await this.prisma.donation.findUnique({
            where: { transactionHash: hash },
            include: { user: true, project: true },
        });
        return donation ? this.mapToEntity(donation) : null;
    }

    async create(data: CreateDonationDTO): Promise<DonationEntity> {
        const donation = await this.prisma.donation.create({
            data: {
                userId: data.userId,
                projectId: data.projectId,
                fiatAmount: data.fiatAmount ? parseFloat(data.fiatAmount) : null,
                fiatCurrency: data.fiatCurrency,
                coinAmount: parseFloat(data.coinAmount),
                coinType: data.coinType,
                conversionRate: data.conversionRate ? parseFloat(data.conversionRate) : null,
                transactionHash: data.transactionHash,
                isAnonymous: data.isAnonymous ?? false,
                status: data.status,
            },
            include: { user: true, project: true },
        });
        return this.mapToEntity(donation);
    }

    async update(id: number, data: UpdateDonationDTO): Promise<DonationEntity | null> {
        try {
            const donation = await this.prisma.donation.update({
                where: { donationId: id },
                data: {
                    status: data.status,
                    fiatAmount: data.fiatAmount ? parseFloat(data.fiatAmount) : undefined,
                    fiatCurrency: data.fiatCurrency,
                    coinAmount: data.coinAmount ? parseFloat(data.coinAmount) : undefined,
                    conversionRate: data.conversionRate ? parseFloat(data.conversionRate) : undefined,
                },
                include: { user: true, project: true },
            });
            return this.mapToEntity(donation);
        } catch {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.donation.delete({ where: { donationId: id } });
            return true;
        } catch {
            return false;
        }
    }

    async getTotalByProject(projectId: number): Promise<string> {
        const result = await this.prisma.donation.aggregate({
            where: { projectId, status: 'Confirmed' },
            _sum: { coinAmount: true },
        });
        return result._sum.coinAmount?.toString() ?? '0.00';
    }

    private mapToEntity(data: any): DonationEntity {
        return DonationEntity.create({
            donationId: data.donationId,
            userId: data.userId,
            projectId: data.projectId,
            fiatAmount: data.fiatAmount?.toString() ?? null,
            fiatCurrency: data.fiatCurrency,
            coinAmount: data.coinAmount.toString(),
            coinType: data.coinType,
            conversionRate: data.conversionRate?.toString() ?? null,
            transactionHash: data.transactionHash,
            donationDate: data.donationDate,
            isAnonymous: data.isAnonymous ?? false,
            status: data.status,
        });
    }
}
```

**Step 2: 커밋**

```bash
git add src/infrastructure/persistence/adapter/donation.repository.ts
git commit -m "Feature: DonationRepository Prisma 구현"
```

---

### Task 3-2: Mock Payment & Blockchain 서비스 인터페이스 + 구현

**Files:**
- Create: `src/application/service/payment.service.interface.ts`
- Create: `src/application/service/blockchain.service.interface.ts`
- Create: `src/infrastructure/payment/mock-payment.service.ts`
- Create: `src/infrastructure/blockchain/mock-blockchain.service.ts`

**Step 1: 인터페이스 정의**

`src/application/service/payment.service.interface.ts`:

```typescript
export interface PaymentResult {
    checkoutUrl: string;
    orderId: string;
}

export interface WebhookPayload {
    orderId: string;
    status: 'Paid' | 'Failed' | 'Expired';
    amount: string;
    coinType: string;
    transactionHash?: string;
}

export interface IPaymentService {
    createCheckout(amount: string, coinType: string, projectId: number): Promise<PaymentResult>;
    verifyWebhook(payload: any): Promise<WebhookPayload>;
}
```

`src/application/service/blockchain.service.interface.ts`:

```typescript
export interface DistributionResult {
    orgTxHash: string;
    feeTxHash: string;
    orgAmount: string;
    feeAmount: string;
}

export interface IBlockchainService {
    distributePayment(totalAmount: string, orgWalletAddress: string): Promise<DistributionResult>;
    getTransactionStatus(txHash: string): Promise<string>;
}
```

**Step 2: Mock 구현**

`src/infrastructure/payment/mock-payment.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { IPaymentService, PaymentResult, WebhookPayload } from '../../application/service/payment.service.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class MockPaymentService implements IPaymentService {
    async createCheckout(amount: string, coinType: string, projectId: number): Promise<PaymentResult> {
        const orderId = `mock-order-${randomUUID()}`;
        return {
            checkoutUrl: `https://mock-alchemy-pay.example.com/checkout/${orderId}`,
            orderId,
        };
    }

    async verifyWebhook(payload: any): Promise<WebhookPayload> {
        return {
            orderId: payload.orderId,
            status: payload.status ?? 'Paid',
            amount: payload.amount ?? '100.00',
            coinType: payload.coinType ?? 'USDC',
            transactionHash: payload.transactionHash ?? `mock-tx-${randomUUID()}`,
        };
    }
}
```

`src/infrastructure/blockchain/mock-blockchain.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { IBlockchainService, DistributionResult } from '../../application/service/blockchain.service.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class MockBlockchainService implements IBlockchainService {
    async distributePayment(totalAmount: string, orgWalletAddress: string): Promise<DistributionResult> {
        const total = parseFloat(totalAmount);
        const orgAmount = (total * 0.95).toFixed(2);
        const feeAmount = (total * 0.05).toFixed(2);

        return {
            orgTxHash: `mock-org-tx-${randomUUID()}`,
            feeTxHash: `mock-fee-tx-${randomUUID()}`,
            orgAmount,
            feeAmount,
        };
    }

    async getTransactionStatus(txHash: string): Promise<string> {
        return 'confirmed';
    }
}
```

**Step 3: 커밋**

```bash
git add src/application/service/payment.service.interface.ts src/application/service/blockchain.service.interface.ts src/infrastructure/payment/ src/infrastructure/blockchain/
git commit -m "Feature: Mock Payment/Blockchain 서비스 인터페이스 및 구현"
```

---

### Task 3-3: DonationService 구현 + 테스트

**Files:**
- Create: `src/application/service/donation.service.ts`
- Create: `src/application/service/donation.service.spec.ts`

**Step 1: 테스트 작성**

`src/application/service/donation.service.spec.ts`:

```typescript
import { DonationService } from './donation.service';
import { IDonationsRepository } from '../../domain/repository/donations.repository.interface';
import { IPaymentService } from './payment.service.interface';
import { IBlockchainService } from './blockchain.service.interface';
import { DonationEntity } from '../../domain/entity/donation.entity';

const mockDonationsRepo: jest.Mocked<IDonationsRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    findByProject: jest.fn(),
    findByTransactionHash: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getTotalByProject: jest.fn(),
};

const mockPaymentService: jest.Mocked<IPaymentService> = {
    createCheckout: jest.fn(),
    verifyWebhook: jest.fn(),
};

const mockBlockchainService: jest.Mocked<IBlockchainService> = {
    distributePayment: jest.fn(),
    getTransactionStatus: jest.fn(),
};

describe('DonationService', () => {
    let service: DonationService;

    beforeEach(() => {
        service = new DonationService(mockDonationsRepo, mockPaymentService, mockBlockchainService);
        jest.clearAllMocks();
    });

    describe('createDonation', () => {
        it('should create checkout and pending donation', async () => {
            mockPaymentService.createCheckout.mockResolvedValue({
                checkoutUrl: 'https://mock.com/checkout/123',
                orderId: 'order-123',
            });
            const entity = DonationEntity.create({
                donationId: 1, projectId: 1, coinAmount: '100', coinType: 'USDC',
                transactionHash: 'order-123', status: 'Pending',
            });
            mockDonationsRepo.create.mockResolvedValue(entity);

            const result = await service.initiateDonation({
                projectId: 1, coinAmount: '100', coinType: 'USDC', userId: 1,
            });

            expect(result.checkoutUrl).toBeDefined();
            expect(mockDonationsRepo.create).toHaveBeenCalled();
        });
    });

    describe('getDonationById', () => {
        it('should throw if donation not found', async () => {
            mockDonationsRepo.findById.mockResolvedValue(null);
            await expect(service.getDonationById(999)).rejects.toThrow();
        });
    });
});
```

**Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- --testPathPattern=donation.service.spec`
Expected: FAIL

**Step 3: DonationService 구현**

`src/application/service/donation.service.ts`:

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IDonationsRepository } from '../../domain/repository/donations.repository.interface';
import { IPaymentService } from './payment.service.interface';
import { IBlockchainService } from './blockchain.service.interface';
import { DonationEntity } from '../../domain/entity/donation.entity';
import { DonationFilterDTO } from '../dto/donation.dto';

@Injectable()
export class DonationService {
    constructor(
        @Inject('IDonationsRepository') private readonly donationsRepository: IDonationsRepository,
        @Inject('IPaymentService') private readonly paymentService: IPaymentService,
        @Inject('IBlockchainService') private readonly blockchainService: IBlockchainService,
    ) {}

    async initiateDonation(data: {
        projectId: number;
        coinAmount: string;
        coinType: string;
        userId?: number;
        isAnonymous?: boolean;
    }): Promise<{ checkoutUrl: string; donationId: number }> {
        const checkout = await this.paymentService.createCheckout(
            data.coinAmount, data.coinType, data.projectId
        );

        const donation = await this.donationsRepository.create({
            userId: data.userId,
            projectId: data.projectId,
            coinAmount: data.coinAmount,
            coinType: data.coinType,
            transactionHash: checkout.orderId,
            isAnonymous: data.isAnonymous,
            status: 'Pending',
        });

        return { checkoutUrl: checkout.checkoutUrl, donationId: donation.donationId };
    }

    async handleWebhook(payload: any): Promise<DonationEntity> {
        const verified = await this.paymentService.verifyWebhook(payload);
        const donation = await this.donationsRepository.findByTransactionHash(verified.orderId);

        if (!donation) {
            throw new NotFoundException('Donation not found for this order');
        }

        if (verified.status === 'Paid') {
            const updated = await this.donationsRepository.update(donation.donationId, {
                status: 'Confirmed',
            });
            return updated!;
        }

        const updated = await this.donationsRepository.update(donation.donationId, {
            status: 'Failed',
        });
        return updated!;
    }

    async getAllDonations(filter?: DonationFilterDTO): Promise<DonationEntity[]> {
        return this.donationsRepository.findAll(filter);
    }

    async getDonationById(id: number): Promise<DonationEntity> {
        const donation = await this.donationsRepository.findById(id);
        if (!donation) {
            throw new NotFoundException('Donation not found');
        }
        return donation;
    }

    async getDonationsByUser(userId: number): Promise<DonationEntity[]> {
        return this.donationsRepository.findByUser(userId);
    }

    async getDonationsByProject(projectId: number): Promise<DonationEntity[]> {
        return this.donationsRepository.findByProject(projectId);
    }
}
```

**Step 4: 테스트 실행 (성공 확인)**

Run: `npm test -- --testPathPattern=donation.service.spec`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/application/service/donation.service.ts src/application/service/donation.service.spec.ts
git commit -m "Feature: DonationService 구현 및 테스트"
```

---

### Task 3-4: DonationController + WebhookController 구현

**Files:**
- Create: `src/presentation/controller/donation.controller.ts`
- Create: `src/presentation/controller/webhook.controller.ts`

**Step 1: DonationController 작성**

`src/presentation/controller/donation.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param, Query, HttpStatus, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { DonationService } from '../../application/service/donation.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Donations')
@Controller('donations')
export class DonationController {
    constructor(private readonly donationService: DonationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 시작 (체크아웃)' })
    async initiateDonation(@Body() body: any, @Req() req: any, @Res() res: Response) {
        const result = await this.donationService.initiateDonation({
            ...body,
            userId: req.user.userId,
        });
        res.status(HttpStatus.CREATED).json({ success: true, data: result });
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 내역 조회' })
    async getDonations(@Query() filter: any, @Res() res: Response) {
        const donations = await this.donationService.getAllDonations(filter);
        res.status(HttpStatus.OK).json({
            success: true,
            data: donations.map(d => d.toJSON()),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 상세 조회' })
    async getDonationById(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        res.status(HttpStatus.OK).json({ success: true, data: donation.toJSON() });
    }

    @Get('user/:userId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '사용자별 기부 내역' })
    async getDonationsByUser(@Param('userId') userId: string, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByUser(Number(userId));
        res.status(HttpStatus.OK).json({
            success: true,
            data: donations.map(d => d.toJSON()),
        });
    }

    @Get('project/:projectId')
    @Public()
    @ApiOperation({ summary: '프로젝트별 기부 내역' })
    async getDonationsByProject(@Param('projectId') projectId: string, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByProject(Number(projectId));
        res.status(HttpStatus.OK).json({
            success: true,
            data: donations.map(d => d.toJSON()),
        });
    }
}
```

**Step 2: WebhookController 작성**

`src/presentation/controller/webhook.controller.ts`:

```typescript
import { Controller, Post, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { DonationService } from '../../application/service/donation.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    constructor(private readonly donationService: DonationService) {}

    @Post('alchemy-pay')
    @Public()
    @ApiOperation({ summary: 'Alchemy Pay 결제 Webhook 수신' })
    async alchemyPayWebhook(@Body() payload: any, @Res() res: Response) {
        const donation = await this.donationService.handleWebhook(payload);
        res.status(HttpStatus.OK).json({ success: true, data: donation.toJSON() });
    }
}
```

**Step 3: 커밋**

```bash
git add src/presentation/controller/donation.controller.ts src/presentation/controller/webhook.controller.ts
git commit -m "Feature: DonationController + WebhookController 구현"
```

---

### Task 3-5: DonationsModule 생성 + AppModule 등록

**Files:**
- Create: `src/modules/donations.module.ts`
- Modify: `src/app.module.ts`

**Step 1: DonationsModule 작성**

`src/modules/donations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DonationController } from '../presentation/controller/donation.controller';
import { WebhookController } from '../presentation/controller/webhook.controller';
import { DonationService } from '../application/service/donation.service';
import { DonationRepository } from '../infrastructure/persistence/adapter/donation.repository';
import { MockPaymentService } from '../infrastructure/payment/mock-payment.service';
import { MockBlockchainService } from '../infrastructure/blockchain/mock-blockchain.service';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DonationController, WebhookController],
    providers: [
        DonationService,
        {
            provide: 'IDonationsRepository',
            useClass: DonationRepository,
        },
        {
            provide: 'IPaymentService',
            useClass: MockPaymentService,
        },
        {
            provide: 'IBlockchainService',
            useClass: MockBlockchainService,
        },
    ],
    exports: [DonationService],
})
export class DonationsModule {}
```

**Step 2: AppModule에 import 추가**

`src/app.module.ts`의 imports에 `DonationsModule` 추가.

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add src/modules/donations.module.ts src/app.module.ts
git commit -m "Feature: DonationsModule 생성 및 AppModule 등록"
```

---

## Phase 4: 마이페이지 & 사용자 상호작용

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

---

## Phase 5: 관리자 & 정산

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

---

## Phase 6: 실제 외부 연동 (별도 계획 필요)

Phase 6는 Alchemy Pay SDK/API 문서와 XRPL SDK 문서가 확보된 후 별도 구현 계획을 수립한다. Mock 서비스의 인터페이스(`IPaymentService`, `IBlockchainService`)를 구현하는 방식으로, 기존 코드 변경 없이 DI token만 교체하면 된다.

### 교체 방법 (나중에)

`src/modules/donations.module.ts`에서:

```typescript
// Mock → 실제로 교체
{ provide: 'IPaymentService', useClass: AlchemyPayService },     // MockPaymentService 대신
{ provide: 'IBlockchainService', useClass: XrplBlockchainService }, // MockBlockchainService 대신
```

---

## 전체 Task 요약

| Phase | Task | 설명 | 예상 파일 수 |
|-------|------|------|-------------|
| 0 | 0-1 | Prisma 스키마 확장 (role, planType, status) | 1 |
| 0 | 0-2 | Role/PlanType/OrgStatus enum 추가 | 3 |
| 0 | 0-3 | UserEntity에 role 반영 | 4 |
| 0 | 0-4 | OrganizationEntity에 새 필드 반영 | 2 |
| 0 | 0-5 | Roles 데코레이터 & RolesGuard | 4 |
| 0 | 0-6 | 공통 페이지네이션 DTO | 1 |
| 1 | 1-1 | OrganizationRepository 구현 | 1 |
| 1 | 1-2 | OrganizationService + 테스트 | 2 |
| 1 | 1-3 | OrganizationController | 1 |
| 1 | 1-4 | OrganizationsModule + AppModule 등록 | 2 |
| 2 | 2-1 | ProjectRepository 실제 구현 | 2 |
| 2 | 2-2 | ProjectMediaRepository | 1 |
| 2 | 2-3 | ProjectMediaModule + 등록 | 2 |
| 3 | 3-1 | DonationRepository | 1 |
| 3 | 3-2 | Mock Payment/Blockchain 서비스 | 4 |
| 3 | 3-3 | DonationService + 테스트 | 2 |
| 3 | 3-4 | DonationController + WebhookController | 2 |
| 3 | 3-5 | DonationsModule + AppModule 등록 | 2 |
| 4 | 4-1 | FavoriteProjectRepository | 1 |
| 4 | 4-2 | 마이페이지 컨트롤러 (기부자/기관) | 2 |
| 4 | 4-3 | FavoritesModule + MypageModule + 등록 | 3 |
| 5 | 5-1 | AdminController + AdminModule | 3 |
| 6 | — | 별도 계획 (Alchemy Pay + XRPL 연동) | — |

**총: 22개 Task, 약 44개 파일 생성/수정**
