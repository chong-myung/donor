# Phase 2: Project(Campaign) CRUD

## 목표

ProjectRepository의 스텁 메서드를 실제 Prisma 쿼리로 구현하고, ProjectMediaRepository를 새로 추가하여 프로젝트/캠페인 관련 데이터 접근을 완성한다.

## 선행 조건

- **Phase 0 완료**: OrganizationEntity에 planType 필드 반영됨 (정렬 기준으로 사용)
- **Phase 1 완료**: OrganizationsModule 등록됨

## 현재 상태

| 항목 | 상태 |
|------|------|
| `IProjectsRepository` 인터페이스 | 존재 (domain layer) |
| ProjectRepository (Prisma 구현체) | 스텁 상태 (`throw new Error('Method not implemented.')`) |
| ProjectController | 존재하나 `@ApiExcludeController()` 적용됨 |
| ProjectMediaRepository | 미구현 |
| ProjectMediaModule | 미구현 |

## Task 목록

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

## 검증 방법

- [ ] `npm run build` — 빌드 성공
- [ ] ProjectRepository의 모든 메서드가 실제 Prisma 쿼리 실행
- [ ] `GET /api/projects` — Plus 기관 프로젝트가 상단에 정렬됨
- [ ] `GET /api/projects/:id` — 프로젝트 상세 조회 (organization, beneficiary 포함)
- [ ] Swagger (`/api-docs`)에 Projects 태그 노출 (ApiExcludeController 제거됨)
- [ ] ProjectMediaRepository의 CRUD 메서드 정상 동작
