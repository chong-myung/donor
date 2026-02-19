# 기관 입점 신청/심사 프로세스 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** DBML의 org_applications + org_members 테이블을 반영하여 기관 입점 신청→심사→승인→기관 생성→멤버 매핑 플로우를 구현한다.

**Architecture:** Organization.userId (1:1)을 제거하고 org_members (N:N)으로 전환. OrgMemberGuard를 신규 도입하여 기관 소속 권한을 org_members 테이블 기반으로 판단. 승인 시 Prisma $transaction으로 Organization + OrgMember를 원자적 생성.

**Tech Stack:** NestJS 11, Prisma 7, MySQL 8.0, class-validator, @nestjs/swagger

---

### Task 1: Prisma 스키마 변경 — OrgApplication + OrgMember 모델 추가

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: OrgApplication, OrgMember 모델 추가 + Organization/User 수정**

`prisma/schema.prisma` 끝에 다음 모델 추가:

```prisma
model OrgApplication {
  applicationId      Int       @id @default(autoincrement()) @map("application_id")
  userId             Int       @map("user_id")
  orgName            String    @map("org_name") @db.VarChar(255)
  registrationNumber String?   @map("registration_number") @db.VarChar(100)
  registrationDocUrl String?   @map("registration_doc_url") @db.VarChar(255)
  contactName        String?   @map("contact_name") @db.VarChar(100)
  contactPhone       String?   @map("contact_phone") @db.VarChar(20)
  contactEmail       String?   @map("contact_email") @db.VarChar(255)
  description        String?   @map("description") @db.Text
  status             String    @default("PENDING") @map("status") @db.VarChar(20)
  rejectedReason     String?   @map("rejected_reason") @db.Text
  reviewedAt         DateTime? @map("reviewed_at")
  createdAt          DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [userId])

  @@map("org_applications")
}

model OrgMember {
  orgMemberId Int      @id @default(autoincrement()) @map("org_member_id")
  orgId       Int      @map("org_id")
  userId      Int      @map("user_id")
  role        String   @default("ADMIN") @map("role") @db.VarChar(20)
  joinedAt    DateTime @default(now()) @map("joined_at")

  organization Organization @relation(fields: [orgId], references: [orgId])
  user         User         @relation(fields: [userId], references: [userId])

  @@unique([orgId, userId])
  @@map("org_members")
}
```

User 모델 변경 (relation 부분):
```prisma
model User {
  // ... 기존 필드 유지 ...
  donations        Donation[]
  favoriteProjects FavoriteProject[]
  orgApplications  OrgApplication[]   // 추가
  orgMembers       OrgMember[]        // 추가
  // organization  Organization?      // 삭제

  @@map("users")
}
```

Organization 모델 변경:
```prisma
model Organization {
  orgId              Int       @id @default(autoincrement()) @map("org_id")
  name               String    @map("name") @db.VarChar(255)
  registrationNumber String?   @unique @map("registration_number") @db.VarChar(100)
  description        String?   @map("description") @db.Text
  logoUrl            String?   @map("logo_url") @db.VarChar(255)
  walletAddress      String?   @unique @map("wallet_address") @db.VarChar(100)
  contactInfo        String?   @map("contact_info") @db.Text
  isVerified         Boolean   @default(false) @map("is_verified")
  planType           String    @default("FREE") @map("plan_type") @db.VarChar(20)
  status             String    @default("PENDING") @map("status") @db.VarChar(20)
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime? @updatedAt @map("updated_at")

  // userId 필드 + user relation 삭제
  orgMembers OrgMember[]   // 추가
  projects   Project[]

  @@map("organizations")
}
```

핵심 변경사항:
- Organization: `userId Int? @unique` 제거, `user User?` relation 제거
- Organization: `description`, `logoUrl`, `isVerified`, `updatedAt` 추가
- Organization: `walletAddress` → `String?` (nullable, 승인 시점에 없을 수 있음)
- Organization: `orgMembers OrgMember[]` relation 추가
- User: `organization Organization?` 제거, `orgApplications`/`orgMembers` 추가

**Step 2: Prisma generate**

```bash
npx prisma generate
```

**Step 3: DB push (개발 환경)**

```bash
npm run db:push
```

**Step 4: 빌드 확인**

```bash
npm run build
```

빌드 실패 예상: Organization.userId를 참조하는 코드들이 컴파일 에러 발생. Task 2~6에서 수정.

**Step 5: Commit**

```bash
git add prisma/schema.prisma src/generated/prisma/
git commit -m "Feature: Prisma 스키마에 OrgApplication, OrgMember 모델 추가 및 Organization.userId 제거"
```

---

### Task 2: 신규 Entity — OrgApplicationEntity

**Files:**
- Create: `src/domain/entity/org-application.entity.ts`

**Step 1: OrgApplicationEntity 작성**

```typescript
export class OrgApplicationEntity {
    constructor(
        public readonly applicationId: number,
        public readonly userId: number,
        public readonly orgName: string,
        public readonly registrationNumber: string | null,
        public readonly registrationDocUrl: string | null,
        public readonly contactName: string | null,
        public readonly contactPhone: string | null,
        public readonly contactEmail: string | null,
        public readonly description: string | null,
        public readonly status: string,
        public readonly rejectedReason: string | null,
        public readonly reviewedAt: Date | null,
        public readonly createdAt: Date,
    ) {}

    static create(data: {
        applicationId: number;
        userId: number;
        orgName: string;
        registrationNumber?: string | null;
        registrationDocUrl?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactEmail?: string | null;
        description?: string | null;
        status?: string;
        rejectedReason?: string | null;
        reviewedAt?: Date | null;
        createdAt?: Date;
    }): OrgApplicationEntity {
        return new OrgApplicationEntity(
            data.applicationId,
            data.userId,
            data.orgName,
            data.registrationNumber ?? null,
            data.registrationDocUrl ?? null,
            data.contactName ?? null,
            data.contactPhone ?? null,
            data.contactEmail ?? null,
            data.description ?? null,
            data.status ?? 'PENDING',
            data.rejectedReason ?? null,
            data.reviewedAt ?? null,
            data.createdAt ?? new Date(),
        );
    }

    isPending(): boolean {
        return this.status === 'PENDING';
    }

    isApproved(): boolean {
        return this.status === 'APPROVED';
    }

    isRejected(): boolean {
        return this.status === 'REJECTED';
    }

    toJSON() {
        return {
            applicationId: this.applicationId,
            userId: this.userId,
            orgName: this.orgName,
            registrationNumber: this.registrationNumber,
            registrationDocUrl: this.registrationDocUrl,
            contactName: this.contactName,
            contactPhone: this.contactPhone,
            contactEmail: this.contactEmail,
            description: this.description,
            status: this.status,
            rejectedReason: this.rejectedReason,
            reviewedAt: this.reviewedAt,
            createdAt: this.createdAt,
        };
    }
}
```

---

### Task 3: 신규 Entity — OrgMemberEntity

**Files:**
- Create: `src/domain/entity/org-member.entity.ts`

**Step 1: OrgMemberEntity 작성**

```typescript
export class OrgMemberEntity {
    constructor(
        public readonly orgMemberId: number,
        public readonly orgId: number,
        public readonly userId: number,
        public readonly role: string,
        public readonly joinedAt: Date,
    ) {}

    static create(data: {
        orgMemberId: number;
        orgId: number;
        userId: number;
        role?: string;
        joinedAt?: Date;
    }): OrgMemberEntity {
        return new OrgMemberEntity(
            data.orgMemberId,
            data.orgId,
            data.userId,
            data.role ?? 'ADMIN',
            data.joinedAt ?? new Date(),
        );
    }

    isAdmin(): boolean {
        return this.role === 'ADMIN';
    }

    isManager(): boolean {
        return this.role === 'MANAGER';
    }

    toJSON() {
        return {
            orgMemberId: this.orgMemberId,
            orgId: this.orgId,
            userId: this.userId,
            role: this.role,
            joinedAt: this.joinedAt,
        };
    }
}
```

---

### Task 4: OrganizationEntity 수정 — userId 제거, 새 필드 추가

**Files:**
- Modify: `src/domain/entity/organization.entity.ts`

**Step 1: OrganizationEntity 전체 교체**

```typescript
export class OrganizationEntity {
    constructor(
        public readonly orgId: number,
        public readonly name: string,
        public readonly registrationNumber: string | null,
        public readonly description: string | null,
        public readonly logoUrl: string | null,
        public readonly walletAddress: string | null,
        public readonly contactInfo: string | null,
        public readonly isVerified: boolean,
        public readonly planType: string,
        public readonly status: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date | null,
    ) {}

    static create(data: {
        orgId: number;
        name: string;
        registrationNumber?: string | null;
        description?: string | null;
        logoUrl?: string | null;
        walletAddress?: string | null;
        contactInfo?: string | null;
        isVerified?: boolean;
        planType?: string;
        status?: string;
        createdAt?: Date;
        updatedAt?: Date | null;
    }): OrganizationEntity {
        return new OrganizationEntity(
            data.orgId,
            data.name,
            data.registrationNumber ?? null,
            data.description ?? null,
            data.logoUrl ?? null,
            data.walletAddress ?? null,
            data.contactInfo ?? null,
            data.isVerified ?? false,
            data.planType ?? 'FREE',
            data.status ?? 'PENDING',
            data.createdAt ?? new Date(),
            data.updatedAt ?? null,
        );
    }

    isPlusPlan(): boolean {
        return this.planType === 'PLUS';
    }

    isApproved(): boolean {
        return this.status === 'APPROVED';
    }

    toJSON() {
        return {
            orgId: this.orgId,
            name: this.name,
            registrationNumber: this.registrationNumber,
            description: this.description,
            logoUrl: this.logoUrl,
            walletAddress: this.walletAddress,
            contactInfo: this.contactInfo,
            isVerified: this.isVerified,
            planType: this.planType,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
```

변경: `userId` 제거, `description`, `logoUrl`, `isVerified`, `updatedAt` 추가, `walletAddress` nullable.

**Step 2: Commit**

```bash
git add src/domain/entity/
git commit -m "Feature: OrgApplication, OrgMember 엔티티 추가 및 OrganizationEntity 수정"
```

---

### Task 5: 신규 Repository Interface — OrgApplication + OrgMember

**Files:**
- Create: `src/domain/repository/org-application.repository.interface.ts`
- Create: `src/domain/repository/org-member.repository.interface.ts`

**Step 1: IOrgApplicationsRepository**

```typescript
import { OrgApplicationEntity } from '../entity/org-application.entity';

export interface IOrgApplicationsRepository {
    findAll(status?: string): Promise<OrgApplicationEntity[]>;
    findById(id: number): Promise<OrgApplicationEntity | null>;
    findByUserId(userId: number): Promise<OrgApplicationEntity[]>;
    create(data: {
        userId: number;
        orgName: string;
        registrationNumber?: string | null;
        registrationDocUrl?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactEmail?: string | null;
        description?: string | null;
    }): Promise<OrgApplicationEntity>;
    updateStatus(id: number, data: {
        status: string;
        rejectedReason?: string | null;
        reviewedAt?: Date;
    }): Promise<OrgApplicationEntity | null>;
}
```

**Step 2: IOrgMembersRepository**

```typescript
import { OrgMemberEntity } from '../entity/org-member.entity';

export interface IOrgMembersRepository {
    findByOrgId(orgId: number): Promise<OrgMemberEntity[]>;
    findByUserId(userId: number): Promise<OrgMemberEntity[]>;
    findByOrgAndUser(orgId: number, userId: number): Promise<OrgMemberEntity | null>;
    create(data: {
        orgId: number;
        userId: number;
        role?: string;
    }): Promise<OrgMemberEntity>;
    delete(orgMemberId: number): Promise<boolean>;
}
```

---

### Task 6: 신규 Repository Implementation — OrgApplication + OrgMember

**Files:**
- Create: `src/infrastructure/persistence/adapter/org-application.repository.ts`
- Create: `src/infrastructure/persistence/adapter/org-member.repository.ts`

**Step 1: OrgApplicationRepository**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IOrgApplicationsRepository } from '../../../domain/repository/org-application.repository.interface';
import { OrgApplicationEntity } from '../../../domain/entity/org-application.entity';

@Injectable()
export class OrgApplicationRepository implements IOrgApplicationsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(status?: string): Promise<OrgApplicationEntity[]> {
        const where = status ? { status } : {};
        const apps = await this.prisma.orgApplication.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return apps.map(this.mapToEntity);
    }

    async findById(id: number): Promise<OrgApplicationEntity | null> {
        const app = await this.prisma.orgApplication.findUnique({
            where: { applicationId: id },
        });
        return app ? this.mapToEntity(app) : null;
    }

    async findByUserId(userId: number): Promise<OrgApplicationEntity[]> {
        const apps = await this.prisma.orgApplication.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return apps.map(this.mapToEntity);
    }

    async create(data: {
        userId: number;
        orgName: string;
        registrationNumber?: string | null;
        registrationDocUrl?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactEmail?: string | null;
        description?: string | null;
    }): Promise<OrgApplicationEntity> {
        const app = await this.prisma.orgApplication.create({ data });
        return this.mapToEntity(app);
    }

    async updateStatus(id: number, data: {
        status: string;
        rejectedReason?: string | null;
        reviewedAt?: Date;
    }): Promise<OrgApplicationEntity | null> {
        try {
            const app = await this.prisma.orgApplication.update({
                where: { applicationId: id },
                data,
            });
            return this.mapToEntity(app);
        } catch {
            return null;
        }
    }

    private mapToEntity(data: any): OrgApplicationEntity {
        return OrgApplicationEntity.create({
            applicationId: data.applicationId,
            userId: data.userId,
            orgName: data.orgName,
            registrationNumber: data.registrationNumber,
            registrationDocUrl: data.registrationDocUrl,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,
            description: data.description,
            status: data.status,
            rejectedReason: data.rejectedReason,
            reviewedAt: data.reviewedAt,
            createdAt: data.createdAt,
        });
    }
}
```

**Step 2: OrgMemberRepository**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IOrgMembersRepository } from '../../../domain/repository/org-member.repository.interface';
import { OrgMemberEntity } from '../../../domain/entity/org-member.entity';

@Injectable()
export class OrgMemberRepository implements IOrgMembersRepository {
    constructor(private prisma: PrismaService) {}

    async findByOrgId(orgId: number): Promise<OrgMemberEntity[]> {
        const members = await this.prisma.orgMember.findMany({
            where: { orgId },
            orderBy: { joinedAt: 'asc' },
        });
        return members.map(this.mapToEntity);
    }

    async findByUserId(userId: number): Promise<OrgMemberEntity[]> {
        const members = await this.prisma.orgMember.findMany({
            where: { userId },
            orderBy: { joinedAt: 'desc' },
        });
        return members.map(this.mapToEntity);
    }

    async findByOrgAndUser(orgId: number, userId: number): Promise<OrgMemberEntity | null> {
        const member = await this.prisma.orgMember.findUnique({
            where: { orgId_userId: { orgId, userId } },
        });
        return member ? this.mapToEntity(member) : null;
    }

    async create(data: {
        orgId: number;
        userId: number;
        role?: string;
    }): Promise<OrgMemberEntity> {
        const member = await this.prisma.orgMember.create({
            data: {
                orgId: data.orgId,
                userId: data.userId,
                role: data.role ?? 'ADMIN',
            },
        });
        return this.mapToEntity(member);
    }

    async delete(orgMemberId: number): Promise<boolean> {
        try {
            await this.prisma.orgMember.delete({
                where: { orgMemberId },
            });
            return true;
        } catch {
            return false;
        }
    }

    private mapToEntity(data: any): OrgMemberEntity {
        return OrgMemberEntity.create({
            orgMemberId: data.orgMemberId,
            orgId: data.orgId,
            userId: data.userId,
            role: data.role,
            joinedAt: data.joinedAt,
        });
    }
}
```

**Step 3: Commit**

```bash
git add src/domain/repository/org-application.repository.interface.ts src/domain/repository/org-member.repository.interface.ts src/infrastructure/persistence/adapter/org-application.repository.ts src/infrastructure/persistence/adapter/org-member.repository.ts
git commit -m "Feature: OrgApplication, OrgMember 레포지토리 인터페이스 및 구현 추가"
```

---

### Task 7: Organization Repository + Interface 수정 — userId 제거

**Files:**
- Modify: `src/domain/repository/organizations.repository.interface.ts`
- Modify: `src/infrastructure/persistence/adapter/organization.repository.ts`

**Step 1: IOrganizationsRepository 수정**

`findByUserId` 제거:

```typescript
import { OrganizationEntity } from '../entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../../application/dto/organization.dto';

export interface IOrganizationsRepository {
    findAll(): Promise<OrganizationEntity[]>;
    findById(id: number): Promise<OrganizationEntity | null>;
    findByWalletAddress(walletAddress: string): Promise<OrganizationEntity | null>;
    create(data: CreateOrganizationDTO): Promise<OrganizationEntity>;
    update(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity | null>;
    delete(id: number): Promise<boolean>;
}
```

**Step 2: OrganizationRepository 수정**

- `findByUserId` 메서드 삭제
- `create` 에서 userId 제거, description/logoUrl/isVerified 추가
- `update` 에서 userId 제거, description/logoUrl/isVerified 추가
- `mapToEntity` 에서 userId 제거, 새 필드 추가

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IOrganizationsRepository } from '../../../domain/repository/organizations.repository.interface';
import { OrganizationEntity } from '../../../domain/entity/organization.entity';
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
                description: data.description,
                logoUrl: data.logoUrl,
                walletAddress: data.walletAddress,
                contactInfo: data.contactInfo,
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
                    description: data.description,
                    logoUrl: data.logoUrl,
                    walletAddress: data.walletAddress,
                    contactInfo: data.contactInfo,
                    isVerified: data.isVerified,
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
        return OrganizationEntity.create({
            orgId: data.orgId,
            name: data.name,
            registrationNumber: data.registrationNumber,
            description: data.description,
            logoUrl: data.logoUrl,
            walletAddress: data.walletAddress,
            contactInfo: data.contactInfo,
            isVerified: data.isVerified,
            planType: data.planType,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
    }
}
```

---

### Task 8: Organization DTO 수정 — userId 제거, 새 필드 추가

**Files:**
- Modify: `src/application/dto/organization.dto.ts`

**Step 1: 전체 교체**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { OrganizationEntity } from '@/domain/entity/organization.entity';

export class CreateOrganizationDTO {
    @ApiProperty({ description: '기관명', example: 'Save the Children' })
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ description: '사업자등록번호' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    registrationNumber?: string | null;

    @ApiPropertyOptional({ description: '기관 소개' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ description: '로고 URL' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    logoUrl?: string | null;

    @ApiPropertyOptional({ description: '지갑 주소', example: 'rXXXXXXXXXX' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    walletAddress?: string | null;

    @ApiPropertyOptional({ description: '연락처 정보' })
    @IsOptional()
    @IsString()
    contactInfo?: string | null;

    @ApiPropertyOptional({ description: '플랜 타입', default: 'FREE', enum: ['FREE', 'PLUS'] })
    @IsOptional()
    @IsString()
    planType?: string;

    @ApiPropertyOptional({ description: '상태', default: 'PENDING', enum: ['PENDING', 'APPROVED', 'SUSPENDED'] })
    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateOrganizationDTO {
    @ApiPropertyOptional({ description: '기관명' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ description: '사업자등록번호' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    registrationNumber?: string | null;

    @ApiPropertyOptional({ description: '기관 소개' })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ description: '로고 URL' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    logoUrl?: string | null;

    @ApiPropertyOptional({ description: '지갑 주소' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    walletAddress?: string;

    @ApiPropertyOptional({ description: '연락처 정보' })
    @IsOptional()
    @IsString()
    contactInfo?: string | null;

    @ApiPropertyOptional({ description: '인증 여부' })
    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @ApiPropertyOptional({ description: '플랜 타입', enum: ['FREE', 'PLUS'] })
    @IsOptional()
    @IsString()
    planType?: string;

    @ApiPropertyOptional({ description: '상태', enum: ['PENDING', 'APPROVED', 'SUSPENDED'] })
    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateWalletDTO {
    @ApiProperty({ description: '새 지갑 주소', example: 'rXXXXXXXXXX' })
    @IsString()
    @MaxLength(100)
    walletAddress: string;
}

export const toOrganizationList = (orgs: OrganizationEntity[]) => {
    return orgs.map((org) => ({
        orgId: org.orgId,
        name: org.name,
        logoUrl: org.logoUrl,
        walletAddress: org.walletAddress,
        isVerified: org.isVerified,
        planType: org.planType,
        status: org.status,
        createdAt: org.createdAt,
    }));
};

export const toOrganizationDetail = (org: OrganizationEntity) => {
    return {
        orgId: org.orgId,
        name: org.name,
        registrationNumber: org.registrationNumber,
        description: org.description,
        logoUrl: org.logoUrl,
        walletAddress: org.walletAddress,
        contactInfo: org.contactInfo,
        isVerified: org.isVerified,
        planType: org.planType,
        status: org.status,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
    };
};
```

변경: userId 관련 필드 전부 제거, description/logoUrl/isVerified/updatedAt 추가.

**Step 2: Commit**

```bash
git add src/domain/repository/organizations.repository.interface.ts src/infrastructure/persistence/adapter/organization.repository.ts src/application/dto/organization.dto.ts
git commit -m "REFACTOR: Organization에서 userId 제거, description/logoUrl/isVerified 추가"
```

---

### Task 9: 신규 DTO — OrgApplication + OrgMember

**Files:**
- Create: `src/application/dto/org-application.dto.ts`
- Create: `src/application/dto/org-member.dto.ts`

**Step 1: OrgApplication DTOs**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { OrgApplicationEntity } from '@/domain/entity/org-application.entity';

export class CreateOrgApplicationDTO {
    @ApiProperty({ description: '신청 기관명', example: 'Save the Children' })
    @IsString()
    @MaxLength(255)
    orgName: string;

    @ApiPropertyOptional({ description: '사업자등록번호' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    registrationNumber?: string | null;

    @ApiPropertyOptional({ description: '사업자등록증 URL' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    registrationDocUrl?: string | null;

    @ApiPropertyOptional({ description: '담당자 이름' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    contactName?: string | null;

    @ApiPropertyOptional({ description: '담당자 연락처' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    contactPhone?: string | null;

    @ApiPropertyOptional({ description: '담당자 이메일' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    contactEmail?: string | null;

    @ApiPropertyOptional({ description: '기관 소개 및 신청 사유' })
    @IsOptional()
    @IsString()
    description?: string | null;
}

export class RejectOrgApplicationDTO {
    @ApiProperty({ description: '반려 사유', example: '서류 미비' })
    @IsString()
    rejectedReason: string;
}

export const toOrgApplicationList = (apps: OrgApplicationEntity[]) => {
    return apps.map((app) => ({
        applicationId: app.applicationId,
        userId: app.userId,
        orgName: app.orgName,
        status: app.status,
        createdAt: app.createdAt,
        reviewedAt: app.reviewedAt,
    }));
};

export const toOrgApplicationDetail = (app: OrgApplicationEntity) => {
    return {
        applicationId: app.applicationId,
        userId: app.userId,
        orgName: app.orgName,
        registrationNumber: app.registrationNumber,
        registrationDocUrl: app.registrationDocUrl,
        contactName: app.contactName,
        contactPhone: app.contactPhone,
        contactEmail: app.contactEmail,
        description: app.description,
        status: app.status,
        rejectedReason: app.rejectedReason,
        reviewedAt: app.reviewedAt,
        createdAt: app.createdAt,
    };
};
```

**Step 2: OrgMember DTOs**

```typescript
import { OrgMemberEntity } from '@/domain/entity/org-member.entity';

export const toOrgMemberList = (members: OrgMemberEntity[]) => {
    return members.map((m) => ({
        orgMemberId: m.orgMemberId,
        orgId: m.orgId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
    }));
};
```

**Step 3: Commit**

```bash
git add src/application/dto/org-application.dto.ts src/application/dto/org-member.dto.ts
git commit -m "Feature: OrgApplication, OrgMember DTO 및 응답 매퍼 추가"
```

---

### Task 10: OrgApplication Service — 신청/승인/반려 로직

**Files:**
- Create: `src/application/service/org-application.service.ts`

**Step 1: OrgApplicationService 작성**

승인 시 `$transaction`으로 Organization + OrgMember 원자적 생성:

```typescript
import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { IOrgApplicationsRepository } from '../../domain/repository/org-application.repository.interface';
import { IOrgMembersRepository } from '../../domain/repository/org-member.repository.interface';
import { IOrganizationsRepository } from '../../domain/repository/organizations.repository.interface';
import { OrgApplicationEntity } from '../../domain/entity/org-application.entity';
import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrgApplicationDTO } from '../dto/org-application.dto';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class OrgApplicationService {
    constructor(
        @Inject('IOrgApplicationsRepository')
        private readonly appRepository: IOrgApplicationsRepository,
        @Inject('IOrgMembersRepository')
        private readonly memberRepository: IOrgMembersRepository,
        @Inject('IOrganizationsRepository')
        private readonly orgRepository: IOrganizationsRepository,
        private readonly prisma: PrismaService,
    ) {}

    async getAllApplications(status?: string): Promise<OrgApplicationEntity[]> {
        return this.appRepository.findAll(status);
    }

    async getApplicationById(id: number): Promise<OrgApplicationEntity> {
        const app = await this.appRepository.findById(id);
        if (!app) {
            throw new NotFoundException('Application not found');
        }
        return app;
    }

    async getMyApplications(userId: number): Promise<OrgApplicationEntity[]> {
        return this.appRepository.findByUserId(userId);
    }

    async submitApplication(userId: number, data: CreateOrgApplicationDTO): Promise<OrgApplicationEntity> {
        const existing = await this.appRepository.findByUserId(userId);
        const hasPending = existing.some((a) => a.isPending());
        if (hasPending) {
            throw new ConflictException('이미 심사 중인 신청이 있습니다.');
        }
        return this.appRepository.create({ userId, ...data });
    }

    async approveApplication(applicationId: number): Promise<{ application: OrgApplicationEntity; organization: OrganizationEntity }> {
        const app = await this.getApplicationById(applicationId);
        if (!app.isPending()) {
            throw new BadRequestException('PENDING 상태의 신청만 승인할 수 있습니다.');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: app.orgName,
                    registrationNumber: app.registrationNumber,
                    status: 'APPROVED',
                },
            });

            await tx.orgMember.create({
                data: {
                    orgId: org.orgId,
                    userId: app.userId,
                    role: 'ADMIN',
                },
            });

            const updated = await tx.orgApplication.update({
                where: { applicationId },
                data: {
                    status: 'APPROVED',
                    reviewedAt: new Date(),
                },
            });

            return { org, updated };
        });

        const organization = OrganizationEntity.create({
            orgId: result.org.orgId,
            name: result.org.name,
            registrationNumber: result.org.registrationNumber,
            status: result.org.status,
            createdAt: result.org.createdAt,
        });

        const application = OrgApplicationEntity.create({
            applicationId: result.updated.applicationId,
            userId: result.updated.userId,
            orgName: result.updated.orgName,
            registrationNumber: result.updated.registrationNumber,
            registrationDocUrl: result.updated.registrationDocUrl,
            contactName: result.updated.contactName,
            contactPhone: result.updated.contactPhone,
            contactEmail: result.updated.contactEmail,
            description: result.updated.description,
            status: result.updated.status,
            rejectedReason: result.updated.rejectedReason,
            reviewedAt: result.updated.reviewedAt,
            createdAt: result.updated.createdAt,
        });

        return { application, organization };
    }

    async rejectApplication(applicationId: number, rejectedReason: string): Promise<OrgApplicationEntity> {
        const app = await this.getApplicationById(applicationId);
        if (!app.isPending()) {
            throw new BadRequestException('PENDING 상태의 신청만 반려할 수 있습니다.');
        }

        const updated = await this.appRepository.updateStatus(applicationId, {
            status: 'REJECTED',
            rejectedReason,
            reviewedAt: new Date(),
        });
        if (!updated) {
            throw new NotFoundException('Application not found');
        }
        return updated;
    }
}
```

**Step 2: Commit**

```bash
git add src/application/service/org-application.service.ts
git commit -m "Feature: OrgApplicationService 신청/승인/반려 로직 구현"
```

---

### Task 11: Organization Service 수정 — getOrganizationByUserId 제거

**Files:**
- Modify: `src/application/service/organization.service.ts`
- Modify: `src/application/service/organizations.service.interface.ts`

**Step 1: IOrganizationsService 수정**

```typescript
import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto/organization.dto';

export interface IOrganizationsService {
    getAllOrganizations(): Promise<OrganizationEntity[]>;
    getOrganizationById(id: number): Promise<OrganizationEntity>;
    createOrganization(data: CreateOrganizationDTO): Promise<OrganizationEntity>;
    updateOrganization(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity>;
    deleteOrganization(id: number): Promise<void>;
}
```

변경 없음 (getOrganizationByUserId는 인터페이스에 없었음).

**Step 2: OrganizationService 수정**

`getOrganizationByUserId`와 `updateWallet` 제거 (updateWallet은 controller에서 직접 updateOrganization으로 호출):

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationsService } from './organizations.service.interface';
import { IOrganizationsRepository } from '../../domain/repository/organizations.repository.interface';
import { OrganizationEntity } from '../../domain/entity/organization.entity';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto/organization.dto';

@Injectable()
export class OrganizationService implements IOrganizationsService {
    constructor(
        @Inject('IOrganizationsRepository')
        private readonly organizationRepository: IOrganizationsRepository,
    ) {}

    async getAllOrganizations(): Promise<OrganizationEntity[]> {
        return this.organizationRepository.findAll();
    }

    async getOrganizationById(id: number): Promise<OrganizationEntity> {
        const org = await this.organizationRepository.findById(id);
        if (!org) {
            throw new NotFoundException('Organization not found');
        }
        return org;
    }

    async createOrganization(data: CreateOrganizationDTO): Promise<OrganizationEntity> {
        return this.organizationRepository.create(data);
    }

    async updateOrganization(id: number, data: UpdateOrganizationDTO): Promise<OrganizationEntity> {
        const updated = await this.organizationRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Organization not found or update failed');
        }
        return updated;
    }

    async deleteOrganization(id: number): Promise<void> {
        const deleted = await this.organizationRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Organization not found or delete failed');
        }
    }
}
```

**Step 3: Commit**

```bash
git add src/application/service/organization.service.ts src/application/service/organizations.service.interface.ts
git commit -m "REFACTOR: OrganizationService에서 getOrganizationByUserId 제거"
```

---

### Task 12: OrgMemberGuard + @OrgRoles 데코레이터

**Files:**
- Create: `src/infrastructure/auth/guard/org-member.guard.ts`
- Create: `src/common/decorators/org-roles.decorator.ts`

**Step 1: @OrgRoles 데코레이터**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ORG_ROLES_KEY = 'orgRoles';
export const OrgRoles = (...roles: string[]) => SetMetadata(ORG_ROLES_KEY, roles);
```

**Step 2: OrgMemberGuard**

PrismaService를 직접 inject하여 org_members 조회:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { ORG_ROLES_KEY } from '../../../common/decorators/org-roles.decorator';

@Injectable()
export class OrgMemberGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;
        if (!userId) {
            throw new ForbiddenException('인증 정보가 없습니다.');
        }

        // org_members에서 해당 유저의 첫 번째 소속 조회
        const membership = await this.prisma.orgMember.findFirst({
            where: { userId },
            orderBy: { joinedAt: 'asc' },
        });

        if (!membership) {
            throw new ForbiddenException('기관 소속이 아닙니다.');
        }

        // request에 orgMember 정보 부착
        request.orgMember = {
            orgMemberId: membership.orgMemberId,
            orgId: membership.orgId,
            userId: membership.userId,
            role: membership.role,
        };

        // @OrgRoles() 데코레이터가 있으면 역할 체크
        const requiredOrgRoles = this.reflector.getAllAndOverride<string[]>(ORG_ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredOrgRoles) {
            return true; // @OrgRoles 없으면 소속만 확인
        }

        const hasRole = requiredOrgRoles.some((role) => membership.role === role);
        if (!hasRole) {
            throw new ForbiddenException('해당 작업에 대한 권한이 없습니다.');
        }

        return true;
    }
}
```

**사용 방식:**
```typescript
@UseGuards(OrgMemberGuard)              // 기관 소속이면 통과
@OrgRoles('ADMIN')                       // + ADMIN 역할 필요
async someMethod(@Req() req: Request) {
    const orgId = (req as any).orgMember.orgId;
}
```

**Step 3: Commit**

```bash
git add src/common/decorators/org-roles.decorator.ts src/infrastructure/auth/guard/org-member.guard.ts
git commit -m "Feature: OrgMemberGuard + @OrgRoles 데코레이터 추가"
```

---

### Task 13: OrgApplication Controller — 사용자 신청 엔드포인트

**Files:**
- Create: `src/presentation/controller/org-application.controller.ts`

**Step 1: OrgApplicationController 작성**

```typescript
import { Controller, Get, Post, Param, Body, Req, HttpStatus, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgApplicationService } from '../../application/service/org-application.service';
import {
    CreateOrgApplicationDTO,
    toOrgApplicationList,
    toOrgApplicationDetail,
} from '../../application/dto/org-application.dto';

@ApiTags('Org Applications')
@Controller('org-applications')
export class OrgApplicationController {
    constructor(private readonly orgApplicationService: OrgApplicationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 입점 신청' })
    @ApiBody({ type: CreateOrgApplicationDTO })
    async submitApplication(
        @Req() req: Request,
        @Body() data: CreateOrgApplicationDTO,
        @Res() res: Response,
    ) {
        const userId = (req as any).user.userId;
        const app = await this.orgApplicationService.submitApplication(userId, data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: toOrgApplicationDetail(app),
        });
    }

    @Get('my')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 입점 신청 내역' })
    async getMyApplications(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const apps = await this.orgApplicationService.getMyApplications(userId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrgApplicationList(apps),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '입점 신청 상세' })
    async getApplicationById(@Param('id') id: string, @Res() res: Response) {
        const app = await this.orgApplicationService.getApplicationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrgApplicationDetail(app),
        });
    }
}
```

---

### Task 14: Admin Controller 수정 — 신청 심사 엔드포인트 추가

**Files:**
- Modify: `src/presentation/controller/admin.controller.ts`

**Step 1: 기존 AdminController에 신청 심사 엔드포인트 추가**

import 추가 + 4개 메서드 추가:

```typescript
import { Controller, Get, Patch, Param, Query, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { OrgApplicationService } from '../../application/service/org-application.service';
import { toOrganizationList, toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList } from '../../application/dto/donation.dto';
import {
    RejectOrgApplicationDTO,
    toOrgApplicationList,
    toOrgApplicationDetail,
} from '../../application/dto/org-application.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
        private readonly orgApplicationService: OrgApplicationService,
    ) {}

    // ── 입점 신청 심사 ──

    @Get('applications')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 목록' })
    async getApplications(@Query('status') status: string, @Res() res: Response) {
        const apps = await this.orgApplicationService.getAllApplications(status || undefined);
        res.status(HttpStatus.OK).json({ success: true, data: toOrgApplicationList(apps) });
    }

    @Get('applications/:id')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 상세' })
    async getApplicationDetail(@Param('id') id: string, @Res() res: Response) {
        const app = await this.orgApplicationService.getApplicationById(Number(id));
        res.status(HttpStatus.OK).json({ success: true, data: toOrgApplicationDetail(app) });
    }

    @Patch('applications/:id/approve')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 승인 → 기관 + 멤버 자동 생성' })
    async approveApplication(@Param('id') id: string, @Res() res: Response) {
        const { application, organization } = await this.orgApplicationService.approveApplication(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: {
                application: toOrgApplicationDetail(application),
                organization: toOrganizationDetail(organization),
            },
        });
    }

    @Patch('applications/:id/reject')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '입점 신청 반려' })
    @ApiBody({ type: RejectOrgApplicationDTO })
    async rejectApplication(
        @Param('id') id: string,
        @Body() data: RejectOrgApplicationDTO,
        @Res() res: Response,
    ) {
        const app = await this.orgApplicationService.rejectApplication(Number(id), data.rejectedReason);
        res.status(HttpStatus.OK).json({ success: true, data: toOrgApplicationDetail(app) });
    }

    // ── 기존 기관 관리 ──

    @Get('organizations')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 리스트 (상태별)' })
    async getOrganizations(@Query('status') status: string, @Res() res: Response) {
        const orgs = await this.organizationService.getAllOrganizations();
        const filtered = status ? orgs.filter(o => o.status === status) : orgs;
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationList(filtered) });
    }

    @Patch('organizations/:id/approve')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 승인' })
    async approveOrganization(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.updateOrganization(Number(id), { status: 'APPROVED' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(org) });
    }

    @Patch('organizations/:id/suspend')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '기관 정지' })
    async suspendOrganization(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.updateOrganization(Number(id), { status: 'SUSPENDED' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(org) });
    }

    @Get('donations')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '전체 기부 내역' })
    async getAllDonations(@Res() res: Response) {
        const donations = await this.donationService.getAllDonations();
        res.status(HttpStatus.OK).json({ success: true, data: toDonationList(donations) });
    }

    @Get('settlements')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '정산 현황 (Mock)' })
    async getSettlements(@Res() res: Response) {
        res.status(HttpStatus.OK).json({ success: true, data: { message: 'Settlement data (mock)' } });
    }

    @Get('revenue')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '플랫폼 수수료 현황 (Mock)' })
    async getRevenue(@Res() res: Response) {
        res.status(HttpStatus.OK).json({ success: true, data: { message: 'Revenue data (mock)' } });
    }
}
```

**Step 2: Commit**

```bash
git add src/presentation/controller/org-application.controller.ts src/presentation/controller/admin.controller.ts
git commit -m "Feature: 입점 신청 사용자/관리자 컨트롤러 추가"
```

---

### Task 15: OrgController 수정 — OrgMemberGuard 적용

**Files:**
- Modify: `src/presentation/controller/org.controller.ts`

**Step 1: 전체 교체**

`@Roles('ORG_ADMIN')` 제거 → `@UseGuards(OrgMemberGuard)` + `@OrgRoles('ADMIN')` 적용.
`getOrgByUser()` → `req.orgMember.orgId` 사용:

```typescript
import { Controller, Get, Post, Param, Query, Req, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgMemberGuard } from '../../infrastructure/auth/guard/org-member.guard';
import { OrgRoles } from '../../common/decorators/org-roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList, toDonationDetail } from '../../application/dto/donation.dto';

@ApiTags('Organization My Page')
@Controller('org')
@UseGuards(OrgMemberGuard)
export class OrgController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

    @Get('dashboard')
    @ApiBearerAuth()
    @OrgRoles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: '기관 대시보드' })
    async getDashboard(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const org = await this.organizationService.getOrganizationById(orgId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: {
                organization: toOrganizationDetail(org),
                planType: org.planType,
            },
        });
    }

    @Get('donations')
    @ApiBearerAuth()
    @OrgRoles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: '기부 수령 내역' })
    async getOrgDonations(@Req() req: Request, @Res() res: Response) {
        const donations = await this.donationService.getAllDonations();
        res.status(HttpStatus.OK).json({ success: true, data: toDonationList(donations) });
    }

    @Get('donations/:id')
    @ApiBearerAuth()
    @OrgRoles('ADMIN', 'MANAGER', 'VIEWER')
    @ApiOperation({ summary: '기부 수령 상세' })
    async getOrgDonationDetail(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        res.status(HttpStatus.OK).json({ success: true, data: toDonationDetail(donation) });
    }

    @Get('plan')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: '현재 플랜 정보' })
    async getPlan(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const org = await this.organizationService.getOrganizationById(orgId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: { planType: org.planType, status: org.status },
        });
    }

    @Post('plan/upgrade')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: 'Plus 구독 (Mock)' })
    async upgradePlan(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const updated = await this.organizationService.updateOrganization(orgId, { planType: 'PLUS' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(updated) });
    }

    @Post('plan/cancel')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: '구독 해지' })
    async cancelPlan(@Req() req: Request, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const updated = await this.organizationService.updateOrganization(orgId, { planType: 'FREE' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(updated) });
    }

    @Get('reports')
    @ApiBearerAuth()
    @OrgRoles('ADMIN')
    @ApiOperation({ summary: '기부 리포트 (Plus 전용)' })
    async getReports(@Req() req: Request, @Query() query: { startDate?: string; endDate?: string }, @Res() res: Response) {
        const orgId = (req as any).orgMember.orgId;
        const org = await this.organizationService.getOrganizationById(orgId);
        if (!org.isPlusPlan()) {
            res.status(HttpStatus.FORBIDDEN).json({ success: false, error: 'Plus plan required' });
            return;
        }
        res.status(HttpStatus.OK).json({ success: true, data: { message: 'Report data (mock)', planType: 'PLUS' } });
    }
}
```

**Step 2: Commit**

```bash
git add src/presentation/controller/org.controller.ts
git commit -m "REFACTOR: OrgController에 OrgMemberGuard 적용, @Roles('ORG_ADMIN') 제거"
```

---

### Task 16: Module 변경 — OrgApplicationsModule + 기존 모듈 수정

**Files:**
- Create: `src/modules/org-applications.module.ts`
- Modify: `src/modules/org.module.ts`
- Modify: `src/modules/admin.module.ts`
- Modify: `src/app.module.ts`

**Step 1: OrgApplicationsModule 생성**

```typescript
import { Module } from '@nestjs/common';
import { OrgApplicationController } from '../presentation/controller/org-application.controller';
import { OrgApplicationService } from '../application/service/org-application.service';
import { OrgApplicationRepository } from '../infrastructure/persistence/adapter/org-application.repository';
import { OrgMemberRepository } from '../infrastructure/persistence/adapter/org-member.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';
import { OrganizationsModule } from './organizations.module';

@Module({
    imports: [PrismaModule, OrganizationsModule],
    controllers: [OrgApplicationController],
    providers: [
        OrgApplicationService,
        {
            provide: 'IOrgApplicationsRepository',
            useClass: OrgApplicationRepository,
        },
        {
            provide: 'IOrgMembersRepository',
            useClass: OrgMemberRepository,
        },
    ],
    exports: [OrgApplicationService, 'IOrgMembersRepository'],
})
export class OrgApplicationsModule {}
```

**Step 2: OrgModule 수정**

OrgMemberGuard는 PrismaService가 필요하므로 PrismaModule import 추가:

```typescript
import { Module } from '@nestjs/common';
import { OrgController } from '../presentation/controller/org.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [OrganizationsModule, DonationsModule, PrismaModule],
    controllers: [OrgController],
})
export class OrgModule {}
```

**Step 3: AdminModule 수정**

OrgApplicationsModule import 추가:

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from '../presentation/controller/admin.controller';
import { ReportController } from '../presentation/controller/report.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';
import { OrgApplicationsModule } from './org-applications.module';

@Module({
    imports: [OrganizationsModule, DonationsModule, OrgApplicationsModule],
    controllers: [AdminController, ReportController],
})
export class AdminModule {}
```

**Step 4: AppModule 수정**

OrgApplicationsModule import 추가:

```typescript
// 기존 imports에 추가:
import { OrgApplicationsModule } from './modules/org-applications.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        UsersModule,
        ProjectsModule,
        AuthModule,
        CommonCodeModule,
        OrganizationsModule,
        ProjectMediaModule,
        FavoriteProjectsModule,
        DonationsModule,
        MeModule,
        OrgModule,
        AdminModule,
        OrgApplicationsModule,  // 추가
    ],
    // ... 기존 providers 유지
})
export class AppModule {}
```

**Step 5: Commit**

```bash
git add src/modules/ src/app.module.ts
git commit -m "Feature: OrgApplicationsModule 추가 및 모듈 연결"
```

---

### Task 17: 빌드 확인 및 최종 커밋

**Step 1: 빌드 확인**

```bash
npm run build
```

빌드 성공 확인. 에러 발생 시 해당 파일 수정.

**주의사항 — 빌드 에러 가능 지점:**
1. `organization.controller.ts`의 `CreateOrganizationDTO`에서 `walletAddress`가 required → optional로 변경됨. 기존 컨트롤러 코드에 영향 없음 (DTO만 변경)
2. `me.controller.ts`에서 `getOrganizationByUserId` 호출 부분이 있다면 수정 필요 — org_members 기반으로 전환해야 함

**Step 2: me.controller.ts 확인 및 수정 (필요 시)**

MeController에서 기관 관련 기능이 있다면 org_members 기반으로 변경 필요. 확인 후 수정.

**Step 3: 최종 빌드 확인**

```bash
npm run build
```

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "Feature: 기관 입점 신청/심사 프로세스 전체 구현 완료"
```

---

## 파일 변경 요약

### 신규 파일 (11개)
| 파일 | 역할 |
|------|------|
| `src/domain/entity/org-application.entity.ts` | 입점 신청 엔티티 |
| `src/domain/entity/org-member.entity.ts` | 기관 멤버 엔티티 |
| `src/domain/repository/org-application.repository.interface.ts` | 입점 신청 레포 인터페이스 |
| `src/domain/repository/org-member.repository.interface.ts` | 기관 멤버 레포 인터페이스 |
| `src/infrastructure/persistence/adapter/org-application.repository.ts` | 입점 신청 Prisma 레포 |
| `src/infrastructure/persistence/adapter/org-member.repository.ts` | 기관 멤버 Prisma 레포 |
| `src/application/dto/org-application.dto.ts` | 입점 신청 DTO + 매퍼 |
| `src/application/dto/org-member.dto.ts` | 기관 멤버 매퍼 |
| `src/application/service/org-application.service.ts` | 신청/승인/반려 비즈니스 로직 |
| `src/infrastructure/auth/guard/org-member.guard.ts` | 기관 소속 확인 가드 |
| `src/common/decorators/org-roles.decorator.ts` | 기관 내부 역할 데코레이터 |
| `src/presentation/controller/org-application.controller.ts` | 사용자 신청 API |
| `src/modules/org-applications.module.ts` | 입점 신청 모듈 |

### 수정 파일 (10개)
| 파일 | 변경 내용 |
|------|-----------|
| `prisma/schema.prisma` | OrgApplication, OrgMember 추가 + Organization.userId 제거 |
| `src/domain/entity/organization.entity.ts` | userId 제거, description/logoUrl/isVerified/updatedAt 추가 |
| `src/domain/repository/organizations.repository.interface.ts` | findByUserId 제거 |
| `src/infrastructure/persistence/adapter/organization.repository.ts` | findByUserId 제거, 새 필드 반영 |
| `src/application/dto/organization.dto.ts` | userId 제거, 새 필드 추가 |
| `src/application/service/organization.service.ts` | getOrganizationByUserId 제거 |
| `src/application/service/organizations.service.interface.ts` | 변경 없음 (확인) |
| `src/presentation/controller/admin.controller.ts` | 신청 심사 엔드포인트 4개 추가 |
| `src/presentation/controller/org.controller.ts` | OrgMemberGuard 적용, @Roles 제거 |
| `src/modules/admin.module.ts` | OrgApplicationsModule import |
| `src/modules/org.module.ts` | PrismaModule import |
| `src/app.module.ts` | OrgApplicationsModule import |
