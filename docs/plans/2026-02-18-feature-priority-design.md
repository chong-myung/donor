# Donor 백엔드 기능 개발 우선순위 계획

> 작성일: 2026-02-18
> 접근법: 기능 슬라이스 수직 개발 (Feature-Slice Vertical)

---

## 결정 사항

| 항목 | 결정 |
|------|------|
| 개발 방식 | 기능 슬라이스 수직 (리포→서비스→컨트롤러→모듈 한번에) |
| MVP 범위 | 기관 입점 + 기부자 플로우 양쪽 동시 진행 |
| Campaign | Project와 동일 (별도 테이블 없음, status/type으로 구분) |
| 플랜 관리 | 초기부터 planType 포함, 권한 분기 적용 |
| 결제/온체인 | Mock 우선 구현, 실제 Alchemy Pay/XRPL 연동은 마지막 Phase |

---

## 현재 구현 상태

### 완료
- 사용자 등록/이메일 로그인 (bcrypt)
- Google OAuth2 전체 플로우
- JWT 인증 (암호화 포함) + 토큰 갱신
- 공통 코드 관리 (GroupCode/CommonCode)
- User 리포지토리 (전체 CRUD)
- 인증 인프라 (GoogleStrategy, JwtStrategy, JwtAuthGuard)
- 9개 도메인 엔티티 클래스

### 미구현/스텁
- Project 리포지토리 (8개 메서드 전부 스텁)
- Donations, Organizations, FavoriteProjects, ProjectMedia 리포지토리 (인터페이스만)
- 5개 이상 서비스 인터페이스 (정의만, 구현 없음)
- Donations, Organizations, Beneficiaries, FavoriteProjects, ProjectMedia 모듈 없음
- 관리자 기능 전체 미구현

---

## Phase 0: 스키마 확장 & 공통 인프라

**목적**: 이후 모든 Phase의 기반이 되는 공통 구조 확립

### 작업 항목
1. **Prisma 스키마 확장**
   - Organization: `planType` (FREE/PLUS), `status` (PENDING/APPROVED/SUSPENDED) 필드 추가
   - User: `role` (DONOR/ORG_ADMIN/PLATFORM_ADMIN) 필드 추가
   - `npx prisma migrate dev` 실행

2. **Role 기반 Guard**
   - `@Roles('DONOR', 'ORG_ADMIN', 'PLATFORM_ADMIN')` 커스텀 데코레이터
   - `RolesGuard` 구현 (JwtAuthGuard와 함께 동작)

3. **공통 페이지네이션**
   - `PaginationRequestDto` (page, limit, sortBy, sortOrder)
   - `PaginatedResponseDto<T>` (data, total, page, limit, totalPages)

4. **공통 응답 래퍼 확인/보강**
   - `{ success: true, data: ... }` 형식 인터셉터 검증

### 의존성: 없음 (최우선)

---

## Phase 1: Organization CRUD (기관 입점)

**목적**: 기관이 플랫폼에 가입하고 프로필/지갑을 등록하는 전체 플로우

### 작업 항목
1. **OrganizationsRepository 구현**
   - `findAll`, `findById`, `findByWalletAddress`, `create`, `update`, `delete`
   - Prisma 쿼리 + entity mapping

2. **OrganizationsService 구현**
   - 기관 등록, 프로필 편집, 지갑 등록/검증, 상태 변경

3. **OrganizationsController**
   - `POST /api/organizations` — 기관 등록
   - `GET /api/organizations` — 기관 리스트 (페이지네이션, Plus 상단 우선 정렬)
   - `GET /api/organizations/:id` — 기관 상세
   - `PATCH /api/organizations/:id` — 기관 프로필 수정
   - `PATCH /api/organizations/:id/wallet` — 지갑 등록/변경

4. **OrganizationsModule** — DI 설정 + AppModule 등록

5. **DTO**
   - CreateOrganizationDto, UpdateOrganizationDto, UpdateWalletDto
   - OrganizationResponseDto, OrganizationListResponseDto

### 의존성: Phase 0

---

## Phase 2: Project(Campaign) CRUD (탐색/생성)

**목적**: 기관이 프로젝트를 생성하고, 기부자가 탐색할 수 있는 API

### 작업 항목
1. **ProjectRepository 실제 구현**
   - 기존 8개 스텁 메서드 → Prisma 쿼리로 교체
   - 필터링/정렬/페이지네이션 지원

2. **ProjectMediaRepository 구현**
   - `findAll`, `findById`, `findByProject`, `findByProjectAndContentType`, `create`, `update`, `delete`

3. **ProjectService 보강**
   - Plus 플랜 체크 로직 (프로젝트 생성 시)
   - 프로젝트 리스트: Plus 기관 상단 우선 정렬
   - 프로젝트 상세: 기관 정보 + 미디어 포함

4. **ProjectController 수정**
   - 필터 파라미터 추가 (nation, status, category)
   - 정렬 파라미터 추가 (Plus 우선)

5. **ProjectMediaModule** 신규

6. **DTO 보강**
   - ProjectListQueryDto (필터/정렬/페이지네이션)
   - ProjectDetailResponseDto (미디어/기관 정보 포함)

### 의존성: Phase 0 (Role Guard), Phase 1 (Organization 존재)

---

## Phase 3: Donation Flow (기부 핵심)

**목적**: 기부자가 기부하고 결과를 확인하는 전체 플로우 (Mock 결제)

### 작업 항목
1. **DonationsRepository 구현**
   - 전체 CRUD + `findByUser`, `findByProject`, `findByTransactionHash`, `getTotalByProject`

2. **DonationsService 구현**
   - 기부 생성 (결제 요청), 상태 변경, 내역 조회, 통계

3. **DonationsController**
   - `POST /api/donations` — 기부 생성 (checkout 시작)
   - `GET /api/donations` — 기부 내역 리스트
   - `GET /api/donations/:id` — 기부 상세 (Tx hash, 분배 구조 포함)
   - `GET /api/donations/user/:userId` — 사용자별 기부 내역
   - `GET /api/donations/project/:projectId` — 프로젝트별 기부 내역

4. **Mock Payment Service**
   - Alchemy Pay checkout URL 생성 mock
   - Webhook 시뮬레이션 (`Paid`/`Failed`/`Expired` 상태)
   - Interface 기반으로 나중에 실제 서비스로 교체 가능

5. **Mock Blockchain Service**
   - Tx Hash 생성 mock
   - 분배(95%/5%) 기록 mock
   - Interface 기반으로 나중에 XRPL 실제 서비스로 교체

6. **Webhook Controller**
   - `POST /api/webhooks/alchemy-pay` — 결제 상태 수신 엔드포인트

7. **DonationsModule** — DI 설정

### 의존성: Phase 0, Phase 2 (Project 존재)

---

## Phase 4: 마이페이지 & 사용자 상호작용

**목적**: 기부자/기관 마이페이지 API 완성

### 작업 항목
1. **FavoriteProjectsRepository 구현**
   - `findByUser`, `create`, `delete`, `exists`

2. **기부자 마이페이지 API**
   - `GET /api/me/donations` — 내 기부 내역
   - `GET /api/me/favorites` — 좋아요 캠페인 리스트
   - `POST /api/me/favorites/:projectId` — 좋아요 추가
   - `DELETE /api/me/favorites/:projectId` — 좋아요 삭제
   - `GET /api/me/wallet` — 지갑 정보
   - `PATCH /api/me/wallet` — 지갑 변경
   - `GET /api/me/profile` — 내 계정 정보
   - `PATCH /api/me/profile` — 계정 정보 수정

3. **기관 마이페이지 API**
   - `GET /api/org/dashboard` — 대시보드 (Free: 일반, Plus: 고급)
   - `GET /api/org/donations` — 기부 수령 내역
   - `GET /api/org/donations/:id` — 기부 수령 상세
   - `GET /api/org/plan` — 현재 플랜 정보
   - `POST /api/org/plan/upgrade` — Plus 구독 (Mock)
   - `POST /api/org/plan/cancel` — 구독 해지

4. **기부 증명서**
   - `GET /api/donations/:id/certificate` — 기부 증명서 데이터 생성

5. **기부 상세 보강**
   - Tx hash, 블록체인 링크, 분배 구조, 기관 전달 금액, 수수료 표시

### 의존성: Phase 1~3 전부

---

## Phase 5: 관리자 & 정산

**목적**: 플랫폼 운영에 필요한 관리자 기능

### 작업 항목
1. **Admin Controller**
   - `GET /api/admin/organizations` — 기관 리스트 (상태별)
   - `PATCH /api/admin/organizations/:id/approve` — 기관 승인
   - `PATCH /api/admin/organizations/:id/suspend` — 기관 정지
   - `GET /api/admin/donations` — 전체 기부 내역
   - `GET /api/admin/settlements` — 정산 현황

2. **기부 리포트** (Plus 기관 전용)
   - `GET /api/org/reports` — 기간 필터 + 다운로드

3. **신고/모더레이션**
   - `POST /api/reports` — 신고 접수
   - `GET /api/admin/reports` — 신고 목록

4. **수익 리포트**
   - `GET /api/admin/revenue` — 플랫폼 수수료 현황

### 의존성: Phase 1~4

---

## Phase 6: 실제 외부 연동

**목적**: Mock 서비스를 실제 외부 서비스로 교체

### 작업 항목
1. **Alchemy Pay 실제 연동**
   - Checkout URL 생성 (실제 API)
   - Webhook 서명 검증
   - 정산 처리

2. **XRPL 실제 연동**
   - 온체인 트랜잭션 (95%/5% 분배)
   - 실제 Tx Hash 저장/공개
   - 블록체인 링크 생성

3. **정산 자동화**
   - 정산 주기 설정
   - 자동 분배 로직

### 의존성: Phase 3, Phase 5

---

## 전체 의존성 다이어그램

```
Phase 0 (스키마/인프라)
  ├──→ Phase 1 (Organization CRUD)
  │       └──→ Phase 2 (Project/Campaign CRUD)
  │               └──→ Phase 3 (Donation + Mock 결제)
  │                       └──→ Phase 4 (마이페이지)
  │                               └──→ Phase 5 (관리자/정산)
  │                                       └──→ Phase 6 (실제 연동)
  └──→ (Phase 1과 Phase 2는 일부 병렬 가능)
```

---

## 참조 문서
- `ia/request_hub.md` — 비즈니스 요구사항
- `ia/마이페이지_기관_free.png` — 기관 Free 플랜 IA
- `ia/마이페이지_기관_plus.png` — 기관 Plus 플랜 IA
- `ia/마이페이지_기부자_기부.png` — 기부자 마이페이지 IA
