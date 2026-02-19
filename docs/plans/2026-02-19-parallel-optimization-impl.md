# Phase 1~5 병렬 최적화 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 0 완료 상태에서 Organization, Project, FavoriteProject, Donation, 마이페이지, 관리자, 외부연동까지 전체 백엔드 API를 구현한다.

**Architecture:** Clean/Hexagonal — 도메인 레이어는 프레임워크 의존 없음. Repository 인터페이스 → Prisma 구현체. Service → Controller 수직 슬라이스. DI는 문자열 토큰 방식(`@Inject('IProjectsRepository')`).

**Tech Stack:** NestJS 11, Prisma 7, MySQL 8.0, TypeScript 5.9, class-validator, Swagger

---

## Phase 1-A: Organization CRUD

### Task 1: OrganizationsRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/organization.repository.ts`

**Step 1: Repository 구현체 작성**

UserRepository 패턴을 따라 Prisma 쿼리 + 엔티티 매핑 구현.

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
                { planType: 'desc' },   // PLUS 먼저
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
                    userId: data.userId,
                    planType: data.planType,
                    status: data.status,
                },
            });
            return this.mapToEntity(org);
        } catch (error) {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.organization.delete({
                where: { orgId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapToEntity(data: any): OrganizationEntity {
        return OrganizationEntity.create({
            orgId: data.orgId,
            name: data.name,
            registrationNumber: data.registrationNumber,
            walletAddress: data.walletAddress,
            contactInfo: data.contactInfo,
            userId: data.userId,
            planType: data.planType,
            status: data.status,
            createdAt: data.createdAt,
        });
    }
}
```

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공 (아직 모듈 등록 전이므로 DI 에러 없음)

**Step 3: 커밋**

```bash
git add src/infrastructure/persistence/adapter/organization.repository.ts
git commit -m "Feature: Organization 리포지토리 Prisma 구현"
```

---

### Task 2: Organization DTO 보강

**Files:**
- Modify: `src/application/dto/organization.dto.ts`

**Step 1: DTO를 class + Swagger + class-validator로 변환**

기존 인터페이스를 클래스로 변환. project.dto.ts 패턴 참조.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
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

    @ApiProperty({ description: '지갑 주소', example: 'rXXXXXXXXXX' })
    @IsString()
    @MaxLength(100)
    walletAddress: string;

    @ApiPropertyOptional({ description: '연락처 정보' })
    @IsOptional()
    @IsString()
    contactInfo?: string | null;

    @ApiPropertyOptional({ description: '관리자 사용자 ID' })
    @IsOptional()
    userId?: number | null;

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

    @ApiPropertyOptional({ description: '지갑 주소' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    walletAddress?: string;

    @ApiPropertyOptional({ description: '연락처 정보' })
    @IsOptional()
    @IsString()
    contactInfo?: string | null;

    @ApiPropertyOptional({ description: '관리자 사용자 ID' })
    @IsOptional()
    userId?: number | null;

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

// 기관 목록 응답 매퍼
export const toOrganizationList = (orgs: OrganizationEntity[]) => {
    return orgs.map((org) => ({
        orgId: org.orgId,
        name: org.name,
        walletAddress: org.walletAddress,
        planType: org.planType,
        status: org.status,
        createdAt: org.createdAt,
    }));
};

// 기관 상세 응답 매퍼
export const toOrganizationDetail = (org: OrganizationEntity) => {
    return {
        orgId: org.orgId,
        name: org.name,
        registrationNumber: org.registrationNumber,
        walletAddress: org.walletAddress,
        contactInfo: org.contactInfo,
        userId: org.userId,
        planType: org.planType,
        status: org.status,
        createdAt: org.createdAt,
    };
};
```

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공

**Step 3: 커밋**

```bash
git add src/application/dto/organization.dto.ts
git commit -m "Feature: Organization DTO class 변환 + Swagger + 응답 매퍼"
```

---

### Task 3: OrganizationsService 구현

**Files:**
- Create: `src/application/service/organization.service.ts`

**Step 1: 서비스 구현체 작성**

ProjectService 패턴 참조. IOrganizationsService 인터페이스 구현.

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

    async updateWallet(id: number, walletAddress: string): Promise<OrganizationEntity> {
        const updated = await this.organizationRepository.update(id, { walletAddress });
        if (!updated) {
            throw new NotFoundException('Organization not found');
        }
        return updated;
    }
}
```

**Step 2: 빌드 확인**

Run: `npm run build`

**Step 3: 커밋**

```bash
git add src/application/service/organization.service.ts
git commit -m "Feature: OrganizationService 구현"
```

---

### Task 4: OrganizationsController 구현

**Files:**
- Create: `src/presentation/controller/organization.controller.ts`

**Step 1: 컨트롤러 작성**

ProjectController 패턴 참조. 5개 엔드포인트.

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infrastructure/auth/decorator/roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import {
    CreateOrganizationDTO,
    UpdateOrganizationDTO,
    UpdateWalletDTO,
    toOrganizationList,
    toOrganizationDetail,
} from '../../application/dto/organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 등록' })
    @ApiBody({ type: CreateOrganizationDTO })
    async createOrganization(@Body() data: CreateOrganizationDTO, @Res() res: Response) {
        const org = await this.organizationService.createOrganization(data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 리스트 (Plus 상단 우선)' })
    async getOrganizations(@Res() res: Response) {
        const orgs = await this.organizationService.getAllOrganizations();
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationList(orgs),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 상세' })
    async getOrganizationById(@Param('id') id: string, @Res() res: Response) {
        const org = await this.organizationService.getOrganizationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }

    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 프로필 수정' })
    @ApiBody({ type: UpdateOrganizationDTO })
    async updateOrganization(
        @Param('id') id: string,
        @Body() data: UpdateOrganizationDTO,
        @Res() res: Response,
    ) {
        const org = await this.organizationService.updateOrganization(Number(id), data);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }

    @Patch(':id/wallet')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기관 지갑 등록/변경' })
    @ApiBody({ type: UpdateWalletDTO })
    async updateWallet(
        @Param('id') id: string,
        @Body() data: UpdateWalletDTO,
        @Res() res: Response,
    ) {
        const org = await this.organizationService.updateWallet(Number(id), data.walletAddress);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toOrganizationDetail(org),
        });
    }
}
```

**Step 2: 빌드 확인**

Run: `npm run build`

**Step 3: 커밋**

```bash
git add src/presentation/controller/organization.controller.ts
git commit -m "Feature: OrganizationController 5개 엔드포인트 구현"
```

---

### Task 5: OrganizationsModule + AppModule 등록

**Files:**
- Create: `src/modules/organizations.module.ts`
- Modify: `src/app.module.ts`

**Step 1: 모듈 생성**

ProjectsModule 패턴 참조.

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

**Step 2: AppModule에 등록**

`src/app.module.ts`의 imports 배열에 `OrganizationsModule` 추가.

```typescript
import { OrganizationsModule } from './modules/organizations.module';

// imports 배열에 추가:
// OrganizationsModule,
```

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공. Organization API가 `/api/organizations`에서 동작.

**Step 4: 커밋**

```bash
git add src/modules/organizations.module.ts src/app.module.ts
git commit -m "Feature: OrganizationsModule 생성 + AppModule 등록"
```

---

## Phase 1-B: Project 실구현 + ProjectMedia

### Task 6: ProjectRepository 스텁 → 실구현

**Files:**
- Modify: `src/infrastructure/persistence/adapter/project.repository.ts`

**Step 1: 12개 스텁 메서드를 Prisma 쿼리로 교체**

UserRepository/OrganizationRepository 패턴 참조. 필터링/정렬/페이지네이션 지원.

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
        const where: any = {};
        if (filter?.nation) where.nation = filter.nation;
        if (filter?.status) where.status = filter.status;
        if (filter?.minGoalAmount || filter?.maxGoalAmount) {
            where.goalAmount = {};
            if (filter.minGoalAmount) where.goalAmount.gte = parseFloat(filter.minGoalAmount);
            if (filter.maxGoalAmount) where.goalAmount.lte = parseFloat(filter.maxGoalAmount);
        }

        const page = filter?.page ?? 1;
        const limit = filter?.limit ?? 20;

        const projects = await this.prisma.project.findMany({
            where,
            include: { organization: true, beneficiary: true },
            orderBy: [
                { organization: { planType: 'desc' } },  // PLUS 우선
                { projectId: 'desc' },
            ],
            skip: (page - 1) * limit,
            take: limit,
        });
        return projects.map(this.mapToEntity);
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
        });
        return projects.map(this.mapToEntity);
    }

    async findByStatus(status: string): Promise<ProjectEntity[]> {
        const projects = await this.prisma.project.findMany({
            where: { status },
            include: { organization: true, beneficiary: true },
        });
        return projects.map(this.mapToEntity);
    }

    async create(data: CreateProjectDTO): Promise<ProjectEntity> {
        const project = await this.prisma.project.create({
            data: {
                orgId: data.orgId,
                nation: (data as any).nation ?? '',
                title: data.title,
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
        } catch (error) {
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
            await this.prisma.project.delete({
                where: { projectId: id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private mapToEntity(data: any): ProjectEntity {
        return ProjectEntity.create({
            projectId: data.projectId,
            orgId: data.orgId,
            beneficiaryId: data.beneficiaryId,
            nation: data.nation,
            title: data.title,
            thumbnailUrl: data.thumbnailUrl,
            shortDescription: data.shortDescription,
            detailedDescription: data.detailedDescription,
            goalAmount: data.goalAmount?.toString() ?? null,
            currentRaisedUsdc: data.currentRaisedUsdc?.toString() ?? '0.00',
            status: data.status,
            startDate: data.startDate,
            organization: data.organization
                ? OrganizationEntity.create(data.organization)
                : undefined,
            beneficiary: data.beneficiary
                ? BeneficiaryEntity.create(data.beneficiary)
                : undefined,
        });
    }
}
```

**Step 2: 빌드 확인**

Run: `npm run build`

**Step 3: 커밋**

```bash
git add src/infrastructure/persistence/adapter/project.repository.ts
git commit -m "Feature: ProjectRepository 12개 스텁 메서드 Prisma 실구현"
```

---

### Task 7: ProjectMediaRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/project-media.repository.ts`

**Step 1: 리포지토리 구현체 작성**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IProjectMediaRepository } from '../../../domain/repository/project-media.repository.interface';
import { ProjectMediaEntity } from '../../../domain/entity/project-media.entity';
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
        } catch (error) {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.projectMedia.delete({
                where: { mediaId: id },
            });
            return true;
        } catch (error) {
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

**Step 2: 빌드 확인**

Run: `npm run build`

**Step 3: 커밋**

```bash
git add src/infrastructure/persistence/adapter/project-media.repository.ts
git commit -m "Feature: ProjectMediaRepository Prisma 구현"
```

---

### Task 8: ProjectMedia 서비스 구현

**Files:**
- Create: `src/application/service/project-media.service.ts`

**Step 1: 서비스 구현체 작성**

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProjectMediaService } from './project-media.service.interface';
import { IProjectMediaRepository } from '../../domain/repository/project-media.repository.interface';
import { ProjectMediaEntity } from '../../domain/entity/project-media.entity';
import { CreateProjectMediaDTO, UpdateProjectMediaDTO } from '../dto/project-media.dto';

@Injectable()
export class ProjectMediaService implements IProjectMediaService {
    constructor(
        @Inject('IProjectMediaRepository')
        private readonly mediaRepository: IProjectMediaRepository,
    ) {}

    async getAllMedia(): Promise<ProjectMediaEntity[]> {
        return this.mediaRepository.findAll();
    }

    async getMediaById(id: number): Promise<ProjectMediaEntity> {
        const media = await this.mediaRepository.findById(id);
        if (!media) {
            throw new NotFoundException('Media not found');
        }
        return media;
    }

    async getMediaByProject(projectId: number): Promise<ProjectMediaEntity[]> {
        return this.mediaRepository.findByProject(projectId);
    }

    async createMedia(data: CreateProjectMediaDTO): Promise<ProjectMediaEntity> {
        return this.mediaRepository.create(data);
    }

    async updateMedia(id: number, data: UpdateProjectMediaDTO): Promise<ProjectMediaEntity> {
        const updated = await this.mediaRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Media not found or update failed');
        }
        return updated;
    }

    async deleteMedia(id: number): Promise<void> {
        const deleted = await this.mediaRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Media not found or delete failed');
        }
    }
}
```

**Step 2: 커밋**

```bash
git add src/application/service/project-media.service.ts
git commit -m "Feature: ProjectMediaService 구현"
```

---

### Task 9: ProjectMediaModule + ProjectDTO 보강

**Files:**
- Create: `src/modules/project-media.module.ts`
- Modify: `src/app.module.ts`
- Modify: `src/application/dto/project.dto.ts`

**Step 1: ProjectMediaModule 생성**

```typescript
import { Module } from '@nestjs/common';
import { ProjectMediaService } from '../application/service/project-media.service';
import { ProjectMediaRepository } from '../infrastructure/persistence/adapter/project-media.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        ProjectMediaService,
        {
            provide: 'IProjectMediaRepository',
            useClass: ProjectMediaRepository,
        },
    ],
    exports: [ProjectMediaService],
})
export class ProjectMediaModule {}
```

**Step 2: AppModule에 등록**

`src/app.module.ts`의 imports에 `ProjectMediaModule` 추가.

**Step 3: ProjectDTO에 nation 필드 추가 + CreateProjectDTO 보강**

`src/application/dto/project.dto.ts`의 `CreateProjectDTO`에 `nation` 필드 추가:

```typescript
@ApiProperty({ description: '프로젝트 국가', example: 'KR' })
@IsString()
nation: string;
```

`ProjectFilterDTO`에 `category` 필드 추가 (향후 사용):

```typescript
@ApiPropertyOptional()
category?: string;
```

**Step 4: 빌드 확인 + 커밋**

```bash
git add src/modules/project-media.module.ts src/app.module.ts src/application/dto/project.dto.ts
git commit -m "Feature: ProjectMediaModule 생성 + ProjectDTO 보강"
```

---

## Phase 1-C: FavoriteProject CRUD

### Task 10: FavoriteProjectsRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/favorite-project.repository.ts`

**Step 1: 리포지토리 구현체 작성**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IFavoriteProjectsRepository } from '../../../domain/repository/favorite-projects.repository.interface';
import { FavoriteProjectEntity } from '../../../domain/entity/favorite-project.entity';
import { CreateFavoriteProjectDTO, FavoriteProjectFilterDTO } from '../../../application/dto/favorite-project.dto';
import { ProjectEntity } from '../../../domain/entity/project.entity';

@Injectable()
export class FavoriteProjectRepository implements IFavoriteProjectsRepository {
    constructor(private prisma: PrismaService) {}

    async findAll(filter?: FavoriteProjectFilterDTO): Promise<FavoriteProjectEntity[]> {
        const where: any = {};
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.projectId) where.projectId = filter.projectId;

        const favorites = await this.prisma.favoriteProject.findMany({
            where,
            include: { project: true },
        });
        return favorites.map(this.mapToEntity);
    }

    async findByUser(userId: number): Promise<FavoriteProjectEntity[]> {
        const favorites = await this.prisma.favoriteProject.findMany({
            where: { userId },
            include: { project: true },
            orderBy: { favoritedAt: 'desc' },
        });
        return favorites.map(this.mapToEntity);
    }

    async findByUserAndProject(userId: number, projectId: number): Promise<FavoriteProjectEntity | null> {
        const favorite = await this.prisma.favoriteProject.findUnique({
            where: { userId_projectId: { userId, projectId } },
            include: { project: true },
        });
        return favorite ? this.mapToEntity(favorite) : null;
    }

    async create(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity> {
        const favorite = await this.prisma.favoriteProject.create({
            data: {
                userId: data.userId,
                projectId: data.projectId,
            },
            include: { project: true },
        });
        return this.mapToEntity(favorite);
    }

    async delete(userId: number, projectId: number): Promise<boolean> {
        try {
            await this.prisma.favoriteProject.delete({
                where: { userId_projectId: { userId, projectId } },
            });
            return true;
        } catch (error) {
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
            project: data.project
                ? ProjectEntity.create({
                    projectId: data.project.projectId,
                    orgId: data.project.orgId,
                    beneficiaryId: data.project.beneficiaryId,
                    nation: data.project.nation,
                    title: data.project.title,
                    thumbnailUrl: data.project.thumbnailUrl,
                    shortDescription: data.project.shortDescription,
                    detailedDescription: data.project.detailedDescription,
                    goalAmount: data.project.goalAmount?.toString() ?? null,
                    currentRaisedUsdc: data.project.currentRaisedUsdc?.toString() ?? '0.00',
                    status: data.project.status,
                    startDate: data.project.startDate,
                })
                : undefined,
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

### Task 11: FavoriteProjectsService 구현

**Files:**
- Create: `src/application/service/favorite-project.service.ts`

**Step 1: 서비스 구현체 작성**

```typescript
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IFavoriteProjectsService } from './favorite-projects.service.interface';
import { IFavoriteProjectsRepository } from '../../domain/repository/favorite-projects.repository.interface';
import { FavoriteProjectEntity } from '../../domain/entity/favorite-project.entity';
import { CreateFavoriteProjectDTO } from '../dto/favorite-project.dto';

@Injectable()
export class FavoriteProjectService implements IFavoriteProjectsService {
    constructor(
        @Inject('IFavoriteProjectsRepository')
        private readonly favoriteRepository: IFavoriteProjectsRepository,
    ) {}

    async getFavoritesByUser(userId: number): Promise<FavoriteProjectEntity[]> {
        return this.favoriteRepository.findByUser(userId);
    }

    async addFavorite(data: CreateFavoriteProjectDTO): Promise<FavoriteProjectEntity> {
        const exists = await this.favoriteRepository.exists(data.userId, data.projectId);
        if (exists) {
            throw new ConflictException('Already favorited');
        }
        return this.favoriteRepository.create(data);
    }

    async removeFavorite(userId: number, projectId: number): Promise<void> {
        const deleted = await this.favoriteRepository.delete(userId, projectId);
        if (!deleted) {
            throw new NotFoundException('Favorite not found');
        }
    }

    async isFavorite(userId: number, projectId: number): Promise<boolean> {
        return this.favoriteRepository.exists(userId, projectId);
    }
}
```

**Step 2: 커밋**

```bash
git add src/application/service/favorite-project.service.ts
git commit -m "Feature: FavoriteProjectService 구현"
```

---

### Task 12: FavoriteProjectsModule + AppModule 등록

**Files:**
- Create: `src/modules/favorite-projects.module.ts`
- Modify: `src/app.module.ts`

**Step 1: 모듈 생성**

```typescript
import { Module } from '@nestjs/common';
import { FavoriteProjectService } from '../application/service/favorite-project.service';
import { FavoriteProjectRepository } from '../infrastructure/persistence/adapter/favorite-project.repository';
import { PrismaModule } from '../infrastructure/persistence/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        FavoriteProjectService,
        {
            provide: 'IFavoriteProjectsRepository',
            useClass: FavoriteProjectRepository,
        },
    ],
    exports: [FavoriteProjectService],
})
export class FavoriteProjectsModule {}
```

**Step 2: AppModule에 등록**

`src/app.module.ts`의 imports에 `FavoriteProjectsModule` 추가.

**Step 3: 빌드 확인 + 커밋**

```bash
git add src/modules/favorite-projects.module.ts src/app.module.ts
git commit -m "Feature: FavoriteProjectsModule 생성 + AppModule 등록"
```

---

### Task 13: Phase 1 전체 빌드 검증

**Step 1: 전체 빌드**

Run: `npm run build`
Expected: 컴파일 성공. 에러 0개.

**Step 2: 서버 기동 테스트**

Run: `npm run start:dev`
Expected: NestJS 부트스트랩 완료. Organization, Project, FavoriteProject 모듈 로드 확인.

**Step 3: Swagger 확인**

`/api-docs`에서 Organization 엔드포인트 5개 확인.

---

## Phase 2: Donation Flow (Mock 결제)

### Task 14: DonationsRepository 구현

**Files:**
- Create: `src/infrastructure/persistence/adapter/donation.repository.ts`

**Step 1: 리포지토리 구현체 작성**

OrganizationRepository 패턴 참조. `findByUser`, `findByProject`, `findByTransactionHash`, `getTotalByProject` 포함.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IDonationsRepository } from '../../../domain/repository/donations.repository.interface';
import { DonationEntity } from '../../../domain/entity/donation.entity';
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
        return donations.map(this.mapToEntity);
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
        return donations.map(this.mapToEntity);
    }

    async findByProject(projectId: number): Promise<DonationEntity[]> {
        const donations = await this.prisma.donation.findMany({
            where: { projectId },
            include: { user: true },
            orderBy: { donationDate: 'desc' },
        });
        return donations.map(this.mapToEntity);
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
        } catch (error) {
            return null;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.donation.delete({
                where: { donationId: id },
            });
            return true;
        } catch (error) {
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

### Task 15: Donation DTO 보강

**Files:**
- Modify: `src/application/dto/donation.dto.ts`

**Step 1: 인터페이스를 class + Swagger + class-validator로 변환**

Organization DTO 패턴 참조. 응답 매퍼 함수 추가.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { DonationEntity } from '@/domain/entity/donation.entity';

export class CreateDonationDTO {
    @ApiPropertyOptional({ description: '기부자 ID' })
    @IsOptional()
    @IsNumber()
    userId?: number | null;

    @ApiProperty({ description: '프로젝트 ID' })
    @IsNumber()
    projectId: number;

    @ApiPropertyOptional({ description: '법정 화폐 금액' })
    @IsOptional()
    @IsString()
    fiatAmount?: string | null;

    @ApiPropertyOptional({ description: '법정 화폐 종류', example: 'USD' })
    @IsOptional()
    @IsString()
    fiatCurrency?: string | null;

    @ApiProperty({ description: '코인 금액', example: '100.00000000' })
    @IsString()
    coinAmount: string;

    @ApiProperty({ description: '코인 종류', example: 'USDC' })
    @IsString()
    coinType: string;

    @ApiPropertyOptional({ description: '환율' })
    @IsOptional()
    @IsString()
    conversionRate?: string | null;

    @ApiProperty({ description: '트랜잭션 해시' })
    @IsString()
    transactionHash: string;

    @ApiPropertyOptional({ description: '익명 기부 여부', default: false })
    @IsOptional()
    @IsBoolean()
    isAnonymous?: boolean;

    @ApiProperty({ description: '기부 상태', example: 'Pending' })
    @IsString()
    status: string;
}

export class UpdateDonationDTO {
    @ApiPropertyOptional({ description: '상태' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fiatAmount?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fiatCurrency?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    coinAmount?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    conversionRate?: string | null;
}

export class DonationFilterDTO {
    @ApiPropertyOptional()
    userId?: number;

    @ApiPropertyOptional()
    projectId?: number;

    @ApiPropertyOptional()
    coinType?: string;

    @ApiPropertyOptional()
    status?: string;

    @ApiPropertyOptional()
    isAnonymous?: boolean;

    @ApiPropertyOptional()
    startDate?: Date;

    @ApiPropertyOptional()
    endDate?: Date;
}

// 기부 목록 응답 매퍼
export const toDonationList = (donations: DonationEntity[]) => {
    return donations.map((d) => ({
        donationId: d.donationId,
        projectId: d.projectId,
        coinAmount: d.coinAmount,
        coinType: d.coinType,
        donationDate: d.donationDate,
        isAnonymous: d.isAnonymous,
        status: d.status,
    }));
};

// 기부 상세 응답 매퍼
export const toDonationDetail = (d: DonationEntity) => {
    return {
        donationId: d.donationId,
        userId: d.isAnonymous ? null : d.userId,
        projectId: d.projectId,
        fiatAmount: d.fiatAmount,
        fiatCurrency: d.fiatCurrency,
        coinAmount: d.coinAmount,
        coinType: d.coinType,
        conversionRate: d.conversionRate,
        transactionHash: d.transactionHash,
        donationDate: d.donationDate,
        isAnonymous: d.isAnonymous,
        status: d.status,
    };
};
```

**Step 2: 커밋**

```bash
git add src/application/dto/donation.dto.ts
git commit -m "Feature: Donation DTO class 변환 + Swagger + 응답 매퍼"
```

---

### Task 16: Mock Payment Service + Mock Blockchain Service

**Files:**
- Create: `src/application/service/payment.service.interface.ts`
- Create: `src/application/service/mock-payment.service.ts`
- Create: `src/application/service/blockchain.service.interface.ts`
- Create: `src/application/service/mock-blockchain.service.ts`

**Step 1: Payment 인터페이스 정의**

```typescript
// payment.service.interface.ts
export interface IPaymentService {
    createCheckout(amount: string, currency: string, projectId: number): Promise<{ checkoutUrl: string; orderId: string }>;
    verifyWebhook(payload: any, signature: string): Promise<boolean>;
}
```

**Step 2: Mock Payment 구현**

```typescript
// mock-payment.service.ts
import { Injectable } from '@nestjs/common';
import { IPaymentService } from './payment.service.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockPaymentService implements IPaymentService {
    async createCheckout(amount: string, currency: string, projectId: number) {
        const orderId = uuidv4();
        return {
            checkoutUrl: `https://mock-alchemy-pay.example.com/checkout/${orderId}`,
            orderId,
        };
    }

    async verifyWebhook(payload: any, signature: string): Promise<boolean> {
        return true; // Mock: 항상 유효
    }
}
```

**Step 3: Blockchain 인터페이스 정의**

```typescript
// blockchain.service.interface.ts
export interface IBlockchainService {
    createTransaction(amount: string, orgWallet: string, platformWallet: string): Promise<{
        transactionHash: string;
        orgAmount: string;
        platformFee: string;
    }>;
}
```

**Step 4: Mock Blockchain 구현**

```typescript
// mock-blockchain.service.ts
import { Injectable } from '@nestjs/common';
import { IBlockchainService } from './blockchain.service.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockBlockchainService implements IBlockchainService {
    async createTransaction(amount: string, orgWallet: string, platformWallet: string) {
        const total = parseFloat(amount);
        const orgAmount = (total * 0.95).toFixed(8);
        const platformFee = (total * 0.05).toFixed(8);

        return {
            transactionHash: `mock_tx_${uuidv4().replace(/-/g, '')}`,
            orgAmount,
            platformFee,
        };
    }
}
```

**Step 5: uuid 의존성 확인**

Run: `npm list uuid`
없으면: `npm install uuid && npm install -D @types/uuid`

**Step 6: 커밋**

```bash
git add src/application/service/payment.service.interface.ts src/application/service/mock-payment.service.ts src/application/service/blockchain.service.interface.ts src/application/service/mock-blockchain.service.ts
git commit -m "Feature: Mock Payment + Mock Blockchain 서비스 구현"
```

---

### Task 17: DonationsService 구현

**Files:**
- Create: `src/application/service/donation.service.ts`

**Step 1: 서비스 구현체 작성**

Mock Payment + Blockchain 서비스를 조합한 기부 플로우.

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IDonationsService } from './donations.service.interface';
import { IDonationsRepository } from '../../domain/repository/donations.repository.interface';
import { IPaymentService } from './payment.service.interface';
import { IBlockchainService } from './blockchain.service.interface';
import { DonationEntity } from '../../domain/entity/donation.entity';
import { CreateDonationDTO, UpdateDonationDTO, DonationFilterDTO } from '../dto/donation.dto';

@Injectable()
export class DonationService implements IDonationsService {
    constructor(
        @Inject('IDonationsRepository')
        private readonly donationRepository: IDonationsRepository,
        @Inject('IPaymentService')
        private readonly paymentService: IPaymentService,
        @Inject('IBlockchainService')
        private readonly blockchainService: IBlockchainService,
    ) {}

    async getAllDonations(filter?: DonationFilterDTO): Promise<DonationEntity[]> {
        return this.donationRepository.findAll(filter);
    }

    async getDonationById(id: number): Promise<DonationEntity> {
        const donation = await this.donationRepository.findById(id);
        if (!donation) {
            throw new NotFoundException('Donation not found');
        }
        return donation;
    }

    async getDonationsByUser(userId: number): Promise<DonationEntity[]> {
        return this.donationRepository.findByUser(userId);
    }

    async getDonationsByProject(projectId: number): Promise<DonationEntity[]> {
        return this.donationRepository.findByProject(projectId);
    }

    async createDonation(data: CreateDonationDTO): Promise<DonationEntity> {
        return this.donationRepository.create(data);
    }

    async updateDonation(id: number, data: UpdateDonationDTO): Promise<DonationEntity> {
        const updated = await this.donationRepository.update(id, data);
        if (!updated) {
            throw new NotFoundException('Donation not found or update failed');
        }
        return updated;
    }

    async deleteDonation(id: number): Promise<void> {
        const deleted = await this.donationRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Donation not found or delete failed');
        }
    }

    async getTotalByProject(projectId: number): Promise<string> {
        return this.donationRepository.getTotalByProject(projectId);
    }
}
```

**Step 2: 커밋**

```bash
git add src/application/service/donation.service.ts
git commit -m "Feature: DonationService 구현"
```

---

### Task 18: DonationsController + WebhookController

**Files:**
- Create: `src/presentation/controller/donation.controller.ts`
- Create: `src/presentation/controller/webhook.controller.ts`

**Step 1: DonationsController 작성**

```typescript
import { Controller, Get, Post, Body, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DonationService } from '../../application/service/donation.service';
import { CreateDonationDTO, DonationFilterDTO, toDonationList, toDonationDetail } from '../../application/dto/donation.dto';

@ApiTags('Donations')
@Controller('donations')
export class DonationController {
    constructor(private readonly donationService: DonationService) {}

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 생성' })
    @ApiBody({ type: CreateDonationDTO })
    async createDonation(@Body() data: CreateDonationDTO, @Res() res: Response) {
        const donation = await this.donationService.createDonation(data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: toDonationDetail(donation),
        });
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 내역 리스트' })
    async getDonations(@Query() filter: DonationFilterDTO, @Res() res: Response) {
        const donations = await this.donationService.getAllDonations(filter);
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationList(donations),
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '기부 상세' })
    async getDonationById(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationDetail(donation),
        });
    }

    @Get('user/:userId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '사용자별 기부 내역' })
    async getDonationsByUser(@Param('userId') userId: string, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByUser(Number(userId));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationList(donations),
        });
    }

    @Get('project/:projectId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '프로젝트별 기부 내역' })
    async getDonationsByProject(@Param('projectId') projectId: string, @Res() res: Response) {
        const donations = await this.donationService.getDonationsByProject(Number(projectId));
        res.status(HttpStatus.OK).json({
            success: true,
            data: toDonationList(donations),
        });
    }
}
```

**Step 2: WebhookController 작성**

```typescript
import { Controller, Post, Body, HttpStatus, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/infrastructure/auth/decorator/public.decorator';
import { DonationService } from '../../application/service/donation.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    constructor(private readonly donationService: DonationService) {}

    @Post('alchemy-pay')
    @Public()
    @ApiOperation({ summary: 'Alchemy Pay 결제 웹훅 (Mock)' })
    async handleAlchemyPayWebhook(
        @Body() payload: { orderId: string; donationId: number; status: string },
        @Headers('x-signature') signature: string,
        @Res() res: Response,
    ) {
        // Mock: 상태 업데이트만 처리
        if (payload.status === 'Paid') {
            await this.donationService.updateDonation(payload.donationId, { status: 'Confirmed' });
        } else if (payload.status === 'Failed' || payload.status === 'Expired') {
            await this.donationService.updateDonation(payload.donationId, { status: 'Failed' });
        }

        res.status(HttpStatus.OK).json({ success: true });
    }
}
```

**Step 3: 커밋**

```bash
git add src/presentation/controller/donation.controller.ts src/presentation/controller/webhook.controller.ts
git commit -m "Feature: DonationController + WebhookController 구현"
```

---

### Task 19: DonationsModule + AppModule 등록

**Files:**
- Create: `src/modules/donations.module.ts`
- Modify: `src/app.module.ts`

**Step 1: 모듈 생성**

```typescript
import { Module } from '@nestjs/common';
import { DonationController } from '../presentation/controller/donation.controller';
import { WebhookController } from '../presentation/controller/webhook.controller';
import { DonationService } from '../application/service/donation.service';
import { DonationRepository } from '../infrastructure/persistence/adapter/donation.repository';
import { MockPaymentService } from '../application/service/mock-payment.service';
import { MockBlockchainService } from '../application/service/mock-blockchain.service';
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

**Step 2: AppModule에 등록**

`src/app.module.ts`의 imports에 `DonationsModule` 추가.

**Step 3: 빌드 확인 + 커밋**

```bash
git add src/modules/donations.module.ts src/app.module.ts
git commit -m "Feature: DonationsModule 생성 + AppModule 등록"
```

---

## Phase 3: 마이페이지 & 사용자 상호작용

### Task 20: 기부자 마이페이지 컨트롤러

**Files:**
- Create: `src/presentation/controller/me.controller.ts`

**Step 1: 컨트롤러 작성**

DonationService + FavoriteProjectService + UserService를 조합.
8개 엔드포인트: `/api/me/donations`, `/api/me/favorites`, `/api/me/wallet`, `/api/me/profile`.

사용자 ID는 JWT에서 추출 (`req.user.userId`).

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Req, HttpStatus, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DonationService } from '../../application/service/donation.service';
import { FavoriteProjectService } from '../../application/service/favorite-project.service';
import { UserService } from '../../application/service/user.service';
import { toDonationList } from '../../application/dto/donation.dto';

@ApiTags('My Page')
@Controller('me')
export class MeController {
    constructor(
        private readonly donationService: DonationService,
        private readonly favoriteProjectService: FavoriteProjectService,
        private readonly userService: UserService,
    ) {}

    @Get('donations')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 기부 내역' })
    async getMyDonations(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const donations = await this.donationService.getDonationsByUser(userId);
        res.status(HttpStatus.OK).json({ success: true, data: toDonationList(donations) });
    }

    @Get('favorites')
    @ApiBearerAuth()
    @ApiOperation({ summary: '좋아요 캠페인 리스트' })
    async getMyFavorites(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const favorites = await this.favoriteProjectService.getFavoritesByUser(userId);
        res.status(HttpStatus.OK).json({ success: true, data: favorites.map(f => f.toJSON()) });
    }

    @Post('favorites/:projectId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '좋아요 추가' })
    async addFavorite(@Req() req: Request, @Param('projectId') projectId: string, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const favorite = await this.favoriteProjectService.addFavorite({ userId, projectId: Number(projectId) });
        res.status(HttpStatus.CREATED).json({ success: true, data: favorite.toJSON() });
    }

    @Delete('favorites/:projectId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '좋아요 삭제' })
    async removeFavorite(@Req() req: Request, @Param('projectId') projectId: string, @Res() res: Response) {
        const userId = (req as any).user.userId;
        await this.favoriteProjectService.removeFavorite(userId, Number(projectId));
        res.status(HttpStatus.OK).json({ success: true });
    }

    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 계정 정보' })
    async getMyProfile(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.findById(userId);
        res.status(HttpStatus.OK).json({ success: true, data: user });
    }

    @Patch('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '계정 정보 수정' })
    async updateMyProfile(@Req() req: Request, @Body() data: any, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.update(userId, data);
        res.status(HttpStatus.OK).json({ success: true, data: user });
    }

    @Get('wallet')
    @ApiBearerAuth()
    @ApiOperation({ summary: '내 지갑 정보' })
    async getMyWallet(@Req() req: Request, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.findById(userId);
        res.status(HttpStatus.OK).json({ success: true, data: { walletAddress: user?.walletAddress } });
    }

    @Patch('wallet')
    @ApiBearerAuth()
    @ApiOperation({ summary: '지갑 변경' })
    async updateMyWallet(@Req() req: Request, @Body() data: { walletAddress: string }, @Res() res: Response) {
        const userId = (req as any).user.userId;
        const user = await this.userService.update(userId, { walletAddress: data.walletAddress });
        res.status(HttpStatus.OK).json({ success: true, data: { walletAddress: user?.walletAddress } });
    }
}
```

**Step 2: 커밋**

```bash
git add src/presentation/controller/me.controller.ts
git commit -m "Feature: 기부자 마이페이지 컨트롤러 8개 엔드포인트"
```

---

### Task 21: 기관 마이페이지 컨트롤러

**Files:**
- Create: `src/presentation/controller/org.controller.ts`

**Step 1: 컨트롤러 작성**

OrganizationService + DonationService 조합. 6개 엔드포인트.
기관 관리자는 User의 Organization을 통해 기관 ID를 조회.

```typescript
import { Controller, Get, Post, Param, Req, HttpStatus, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infrastructure/auth/decorator/roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList, toDonationDetail } from '../../application/dto/donation.dto';

@ApiTags('Organization My Page')
@Controller('org')
export class OrgController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

    @Get('dashboard')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN')
    @ApiOperation({ summary: '기관 대시보드' })
    async getDashboard(@Req() req: Request, @Res() res: Response) {
        const org = await this.getOrgByUser(req);
        const donations = await this.donationService.getAllDonations({ projectId: undefined });
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
    @Roles('ORG_ADMIN')
    @ApiOperation({ summary: '기부 수령 내역' })
    async getOrgDonations(@Req() req: Request, @Res() res: Response) {
        const org = await this.getOrgByUser(req);
        // 기관의 프로젝트에 대한 기부 조회는 Phase 4에서 보강
        res.status(HttpStatus.OK).json({ success: true, data: [] });
    }

    @Get('donations/:id')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN')
    @ApiOperation({ summary: '기부 수령 상세' })
    async getOrgDonationDetail(@Param('id') id: string, @Res() res: Response) {
        const donation = await this.donationService.getDonationById(Number(id));
        res.status(HttpStatus.OK).json({ success: true, data: toDonationDetail(donation) });
    }

    @Get('plan')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN')
    @ApiOperation({ summary: '현재 플랜 정보' })
    async getPlan(@Req() req: Request, @Res() res: Response) {
        const org = await this.getOrgByUser(req);
        res.status(HttpStatus.OK).json({
            success: true,
            data: { planType: org.planType, status: org.status },
        });
    }

    @Post('plan/upgrade')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN')
    @ApiOperation({ summary: 'Plus 구독 (Mock)' })
    async upgradePlan(@Req() req: Request, @Res() res: Response) {
        const org = await this.getOrgByUser(req);
        const updated = await this.organizationService.updateOrganization(org.orgId, { planType: 'PLUS' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(updated) });
    }

    @Post('plan/cancel')
    @ApiBearerAuth()
    @Roles('ORG_ADMIN')
    @ApiOperation({ summary: '구독 해지' })
    async cancelPlan(@Req() req: Request, @Res() res: Response) {
        const org = await this.getOrgByUser(req);
        const updated = await this.organizationService.updateOrganization(org.orgId, { planType: 'FREE' });
        res.status(HttpStatus.OK).json({ success: true, data: toOrganizationDetail(updated) });
    }

    private async getOrgByUser(req: Request) {
        const userId = (req as any).user.userId;
        // userId로 기관 조회 — OrganizationsRepository에 findByUserId 추가 필요
        // 임시로 userId를 orgId로 사용 (Task 22에서 보강)
        return this.organizationService.getOrganizationById(userId);
    }
}
```

**Step 2: 커밋**

```bash
git add src/presentation/controller/org.controller.ts
git commit -m "Feature: 기관 마이페이지 컨트롤러 6개 엔드포인트"
```

---

### Task 22: OrganizationsRepository에 findByUserId 추가

**Files:**
- Modify: `src/domain/repository/organizations.repository.interface.ts`
- Modify: `src/infrastructure/persistence/adapter/organization.repository.ts`
- Modify: `src/application/service/organization.service.ts`

**Step 1: 인터페이스에 메서드 추가**

```typescript
findByUserId(userId: number): Promise<OrganizationEntity | null>;
```

**Step 2: 리포지토리 구현 추가**

```typescript
async findByUserId(userId: number): Promise<OrganizationEntity | null> {
    const org = await this.prisma.organization.findUnique({
        where: { userId },
    });
    return org ? this.mapToEntity(org) : null;
}
```

**Step 3: 서비스에 메서드 추가**

```typescript
async getOrganizationByUserId(userId: number): Promise<OrganizationEntity> {
    const org = await this.organizationRepository.findByUserId(userId);
    if (!org) {
        throw new NotFoundException('Organization not found for this user');
    }
    return org;
}
```

**Step 4: OrgController의 getOrgByUser 수정**

```typescript
private async getOrgByUser(req: Request) {
    const userId = (req as any).user.userId;
    return this.organizationService.getOrganizationByUserId(userId);
}
```

**Step 5: 커밋**

```bash
git add src/domain/repository/organizations.repository.interface.ts src/infrastructure/persistence/adapter/organization.repository.ts src/application/service/organization.service.ts src/presentation/controller/org.controller.ts
git commit -m "Feature: Organization findByUserId 추가 + OrgController 보강"
```

---

### Task 23: 마이페이지 모듈 + AppModule 등록

**Files:**
- Create: `src/modules/me.module.ts`
- Create: `src/modules/org.module.ts`
- Modify: `src/app.module.ts`

**Step 1: MeModule 생성**

```typescript
import { Module } from '@nestjs/common';
import { MeController } from '../presentation/controller/me.controller';
import { DonationsModule } from './donations.module';
import { FavoriteProjectsModule } from './favorite-projects.module';
import { UsersModule } from './users.module';

@Module({
    imports: [DonationsModule, FavoriteProjectsModule, UsersModule],
    controllers: [MeController],
})
export class MeModule {}
```

**Step 2: OrgModule 생성**

```typescript
import { Module } from '@nestjs/common';
import { OrgController } from '../presentation/controller/org.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';

@Module({
    imports: [OrganizationsModule, DonationsModule],
    controllers: [OrgController],
})
export class OrgModule {}
```

**Step 3: AppModule에 등록**

imports에 `MeModule`, `OrgModule` 추가.

**Step 4: 빌드 확인 + 커밋**

```bash
git add src/modules/me.module.ts src/modules/org.module.ts src/app.module.ts
git commit -m "Feature: MeModule + OrgModule 생성 + AppModule 등록"
```

---

### Task 24: 기부 증명서 API

**Files:**
- Modify: `src/presentation/controller/donation.controller.ts`

**Step 1: 증명서 엔드포인트 추가**

DonationController에 추가:

```typescript
@Get(':id/certificate')
@ApiBearerAuth()
@ApiOperation({ summary: '기부 증명서 데이터' })
async getCertificate(@Param('id') id: string, @Res() res: Response) {
    const donation = await this.donationService.getDonationById(Number(id));
    const detail = toDonationDetail(donation);

    res.status(HttpStatus.OK).json({
        success: true,
        data: {
            ...detail,
            certificateId: `CERT-${donation.donationId}`,
            issuedAt: new Date().toISOString(),
        },
    });
}
```

**Step 2: 커밋**

```bash
git add src/presentation/controller/donation.controller.ts
git commit -m "Feature: 기부 증명서 API 추가"
```

---

## Phase 4: 관리자 & 정산

### Task 25: Admin 컨트롤러

**Files:**
- Create: `src/presentation/controller/admin.controller.ts`

**Step 1: 컨트롤러 작성**

PLATFORM_ADMIN 역할 전용. Organization 승인/정지, 기부 내역 조회, 정산 현황.

```typescript
import { Controller, Get, Patch, Post, Param, Query, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infrastructure/auth/decorator/roles.decorator';
import { OrganizationService } from '../../application/service/organization.service';
import { DonationService } from '../../application/service/donation.service';
import { toOrganizationList, toOrganizationDetail } from '../../application/dto/organization.dto';
import { toDonationList } from '../../application/dto/donation.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly donationService: DonationService,
    ) {}

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
        // Phase 5에서 실제 정산 로직 구현
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

**Step 2: 커밋**

```bash
git add src/presentation/controller/admin.controller.ts
git commit -m "Feature: AdminController 6개 엔드포인트 구현"
```

---

### Task 26: 신고/모더레이션 API

**Files:**
- Create: `src/presentation/controller/report.controller.ts`

**Step 1: 신고 컨트롤러 작성**

신고 접수(일반 사용자) + 신고 목록(관리자). 신고 데이터는 향후 스키마 확장 시 DB 저장.
현재는 인메모리 또는 간단한 구조로 Mock.

```typescript
import { Controller, Get, Post, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infrastructure/auth/decorator/roles.decorator';

@ApiTags('Reports')
@Controller('')
export class ReportController {
    @Post('reports')
    @ApiBearerAuth()
    @ApiOperation({ summary: '신고 접수' })
    async createReport(@Body() data: { targetType: string; targetId: number; reason: string }, @Res() res: Response) {
        // Phase 4: 신고 저장 로직 (DB 스키마 확장 후)
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: { message: 'Report submitted', ...data },
        });
    }

    @Get('admin/reports')
    @ApiBearerAuth()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({ summary: '신고 목록' })
    async getReports(@Res() res: Response) {
        res.status(HttpStatus.OK).json({ success: true, data: [] });
    }
}
```

**Step 2: 커밋**

```bash
git add src/presentation/controller/report.controller.ts
git commit -m "Feature: 신고/모더레이션 API (Mock)"
```

---

### Task 27: 기관 리포트 API (Plus 전용)

**Files:**
- Modify: `src/presentation/controller/org.controller.ts`

**Step 1: 리포트 엔드포인트 추가**

```typescript
@Get('reports')
@ApiBearerAuth()
@Roles('ORG_ADMIN')
@ApiOperation({ summary: '기부 리포트 (Plus 전용)' })
async getReports(@Req() req: Request, @Query() query: { startDate?: string; endDate?: string }, @Res() res: Response) {
    const org = await this.getOrgByUser(req);
    if (!org.isPlusPlan()) {
        res.status(HttpStatus.FORBIDDEN).json({ success: false, error: 'Plus plan required' });
        return;
    }
    // Phase 4: 실제 리포트 생성 로직
    res.status(HttpStatus.OK).json({ success: true, data: { message: 'Report data (mock)', planType: 'PLUS' } });
}
```

**Step 2: 커밋**

```bash
git add src/presentation/controller/org.controller.ts
git commit -m "Feature: 기관 리포트 API (Plus 전용, Mock)"
```

---

### Task 28: Admin 모듈 + AppModule 등록

**Files:**
- Create: `src/modules/admin.module.ts`
- Modify: `src/app.module.ts`

**Step 1: AdminModule 생성**

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from '../presentation/controller/admin.controller';
import { ReportController } from '../presentation/controller/report.controller';
import { OrganizationsModule } from './organizations.module';
import { DonationsModule } from './donations.module';

@Module({
    imports: [OrganizationsModule, DonationsModule],
    controllers: [AdminController, ReportController],
})
export class AdminModule {}
```

**Step 2: AppModule에 등록 + 빌드 확인**

**Step 3: 커밋**

```bash
git add src/modules/admin.module.ts src/app.module.ts
git commit -m "Feature: AdminModule 생성 + AppModule 등록"
```

---

## Phase 5: 실제 외부 연동 (아웃라인)

> Phase 5는 외부 API 키/계정이 필요하므로 상세 구현은 연동 준비 완료 시 작성.

### Task 29: Alchemy Pay 실제 연동

**Files:**
- Create: `src/application/service/alchemy-pay.service.ts`
- Modify: `src/modules/donations.module.ts` — `IPaymentService` 바인딩을 MockPaymentService → AlchemyPayService로 교체

**작업 내용:**
- 실제 API로 checkout URL 생성
- Webhook 서명 검증 (`crypto.createHmac`)
- 환경변수: `ALCHEMY_PAY_API_KEY`, `ALCHEMY_PAY_SECRET`

### Task 30: XRPL 실제 연동

**Files:**
- Create: `src/application/service/xrpl.service.ts`
- Modify: `src/modules/donations.module.ts` — `IBlockchainService` 바인딩을 MockBlockchainService → XrplService로 교체

**작업 내용:**
- `xrpl` npm 패키지 사용
- 실제 온체인 트랜잭션 (95%/5% 분배)
- Tx Hash 저장 + 블록체인 링크 생성
- 환경변수: `XRPL_NETWORK`, `XRPL_WALLET_SEED`

### Task 31: 정산 자동화

**작업 내용:**
- NestJS `@Cron()` 스케줄러로 정산 주기 설정
- 자동 분배 로직
- 정산 내역 DB 저장 (스키마 확장 필요)

---

## 전체 진행 요약

```
Phase 1-A (Task 1~5):  Organization CRUD          ← 즉시 시작 가능
Phase 1-B (Task 6~9):  Project + ProjectMedia      ← Phase 0 완료 (독립)
Phase 1-C (Task 10~12): FavoriteProject            ← Phase 0 완료 (독립)
Task 13:               Phase 1 전체 빌드 검증
Phase 2   (Task 14~19): Donation Flow              ← Phase 1-A + 1-B 필요
Phase 3   (Task 20~24): 마이페이지                  ← Phase 2 필요
Phase 4   (Task 25~28): 관리자 & 정산              ← Phase 3 필요
Phase 5   (Task 29~31): 외부 연동                   ← Phase 2 + 4 필요
```

총 31개 Task, 각 Task는 1~3개 커밋 단위.
