# Phase 3: Donation Flow (기부 핵심)

## 목표

기부 플로우의 핵심 기능을 구현한다. DonationRepository, Mock Payment/Blockchain 서비스, DonationService, DonationController, WebhookController를 구축하여 기부 시작 → 결제 → 확인의 전체 흐름을 완성한다.

## 선행 조건

- **Phase 0 완료**: 공통 인프라 (enum, guard, DTO)
- **Phase 1 완료**: OrganizationService (기관 지갑 주소 조회에 필요)
- **Phase 2 완료**: ProjectRepository 실제 구현 (프로젝트 조회/업데이트에 필요)

## 현재 상태

| 항목 | 상태 |
|------|------|
| `IDonationsRepository` 인터페이스 | 존재 (domain layer) |
| DonationRepository (Prisma 구현체) | 미구현 |
| DonationEntity | 존재 (domain layer) |
| IPaymentService 인터페이스 | 미구현 |
| IBlockchainService 인터페이스 | 미구현 |
| Mock Payment/Blockchain 서비스 | 미구현 |
| DonationService | 미구현 |
| DonationController | 미구현 |
| WebhookController | 미구현 |
| DonationsModule | 미구현 |

## Task 목록

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

## 검증 방법

- [ ] `npm test -- --testPathPattern=donation.service.spec` — 테스트 통과
- [ ] `npm run build` — 빌드 성공
- [ ] Swagger (`/api-docs`)에 Donations, Webhooks 태그 노출
- [ ] `POST /api/donations` — 기부 시작 (checkoutUrl 반환)
- [ ] `POST /api/webhooks/alchemy-pay` — Webhook 수신 → Donation 상태 업데이트
- [ ] `GET /api/donations` — 기부 내역 조회 (인증 필요)
- [ ] `GET /api/donations/project/:projectId` — 프로젝트별 기부 내역 (Public)
- [ ] Mock 서비스가 정상 동작하여 전체 플로우 테스트 가능
