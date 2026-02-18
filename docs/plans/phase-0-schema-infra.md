# Phase 0: 스키마 확장 & 공통 인프라

## 목표

Prisma 스키마에 role/planType/status 필드를 추가하고, 도메인 엔티티에 반영하며, RBAC(Role-Based Access Control) 인프라와 공통 DTO를 구축한다.

## 선행 조건

- 없음 (최초 Phase)
- Docker MySQL 컨테이너 실행 중 (`docker compose up -d`)
- `.env` 파일에 `DATABASE_URL` 설정 완료

## 현재 상태

| 항목 | 상태 |
|------|------|
| User 모델 | role 필드 없음 |
| Organization 모델 | planType, status, userId 필드 없음 |
| UserEntity | role 필드 없음 |
| OrganizationEntity | userId, planType, status 필드 없음 |
| Role enum (UserRole, PlanType, OrgStatus) | 미구현 |
| RolesGuard, @Roles 데코레이터 | 미구현 |
| 공통 페이지네이션 DTO | 미구현 |

## Task 목록

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

## 검증 방법

- [ ] `npx prisma migrate dev` 성공 (User.role, Organization.planType/status/userId 컬럼 추가)
- [ ] `npx prisma generate` 성공
- [ ] `npm test` — 기존 테스트 통과 (UserEntity 생성자 변경 반영)
- [ ] `npm run build` — 빌드 성공
- [ ] RolesGuard가 APP_GUARD로 등록되어 `@Roles()` 데코레이터 동작 확인
- [ ] JWT payload에 `role` 필드 포함 확인
