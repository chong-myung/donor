# Phase 병렬화 최적화 설계

> 작성일: 2026-02-19
> 기반 문서: `2026-02-18-feature-priority-design.md`
> 접근법: 접근법 B — Phase 내부 병합 + Phase 간 부분 병렬화

---

## 배경

기존 계획은 Phase 0→1→2→3→4→5→6 순차 직렬 구조였으나,
실제 코드 의존성을 분석한 결과 과잉 직렬화가 확인됨.

### 과잉 직렬화 지점

| 작업 | 실제 의존 대상 | 기존 Phase 배치 | 문제 |
|------|--------------|----------------|------|
| Organization 리포/서비스/컨트롤러 | Phase 0만 | Phase 1 | - |
| Project 리포 실구현 | Phase 0만 | Phase 2 | Org 완료 불필요 |
| ProjectMedia 리포/서비스 | Phase 0만 | Phase 2 | Org 완료 불필요 |
| FavoriteProject 리포 | Phase 0만 | Phase 4 | Phase 4까지 지연 불필요 |

Organization, Project, ProjectMedia, FavoriteProject의 리포지토리 구현은
**서로 독립적**이며 Phase 0 완료 후 어떤 순서로든 구현 가능.

---

## 결정 사항

| 항목 | 결정 |
|------|------|
| Phase 0 | 완료 (Role Guard, Pagination DTO, 스키마 확장) |
| Phase 재배치 | 7개 → 6개 (Phase 0 완료 기준 5개) |
| FavoriteProject | Phase 4 → Phase 1-C로 앞당김 |
| ProjectMedia | Phase 2에서 분리 → Phase 1-B에 Project와 합침 |
| Phase 1 내부 순서 | 1-A(Org) → 1-B(Project+Media) → 1-C(Favorite) 권장 |

---

## 최적화된 의존성 다이어그램

```
Phase 0 (완료)
  │
  ├── Phase 1-A: Organization CRUD ──┐
  ├── Phase 1-B: Project + Media ────┼── (서로 독립, 순서 자유)
  └── Phase 1-C: FavoriteProject ────┘
          │
          ▼ (1-A + 1-B 완료 필요)
      Phase 2: Donation Flow + Mock 결제
          │
          ▼
      Phase 3: 마이페이지 (기부자 + 기관)
          │
          ▼
      Phase 4: 관리자 & 정산
          │
          ▼
      Phase 5: 실제 외부 연동
```

### 변경 전후 비교

```
[기존]   Phase 0 → 1(Org) → 2(Project) → 3(Donation) → 4(마이페이지+Favorite) → 5(관리자) → 6(외부)

[최적화] Phase 0(완료) → 1-A(Org) → 1-B(Project+Media) → 1-C(Favorite) → 2(Donation) → 3(마이페이지) → 4(관리자) → 5(외부)
                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                         이 3개는 서로 독립 (순서 자유)
```

---

## Phase 1-A: Organization CRUD

**목적**: 기관이 플랫폼에 가입하고 프로필/지갑을 등록하는 전체 플로우
**의존성**: Phase 0 (완료)

### 작업 항목

1. **OrganizationsRepository 구현**
   - `findAll`, `findById`, `findByWalletAddress`, `create`, `update`, `delete`
   - Prisma 쿼리 + OrganizationEntity 매핑

2. **OrganizationsService 구현**
   - 기관 등록, 프로필 편집, 지갑 등록/검증, 상태 변경

3. **OrganizationsController**
   - `POST /api/organizations` — 기관 등록
   - `GET /api/organizations` — 기관 리스트 (페이지네이션, Plus 상단 우선)
   - `GET /api/organizations/:id` — 기관 상세
   - `PATCH /api/organizations/:id` — 프로필 수정
   - `PATCH /api/organizations/:id/wallet` — 지갑 등록/변경

4. **OrganizationsModule** — DI 설정 + AppModule 등록

5. **DTO**
   - CreateOrganizationDto, UpdateOrganizationDto, UpdateWalletDto
   - OrganizationResponseDto, OrganizationListResponseDto
   - class-validator + Swagger 데코레이터

---

## Phase 1-B: Project 실구현 + ProjectMedia

**목적**: 스텁 상태의 Project 리포지토리를 실구현하고 ProjectMedia 수직 슬라이스 완성
**의존성**: Phase 0 (완료)

### 작업 항목

1. **ProjectRepository 실구현**
   - 기존 12개 스텁 메서드 → Prisma 쿼리로 교체
   - 필터링(nation, status, category) / 정렬 / 페이지네이션

2. **ProjectMediaRepository 구현**
   - `findAll`, `findById`, `findByProject`, `findByProjectAndContentType`
   - `create`, `update`, `delete`

3. **ProjectService 보강**
   - Plus 플랜 체크 로직 (프로젝트 생성 시)
   - 프로젝트 리스트: Plus 기관 상단 우선 정렬
   - 프로젝트 상세: 기관 정보 + 미디어 포함

4. **ProjectController 수정**
   - 필터 파라미터 추가 (nation, status, category)
   - 정렬 파라미터 추가 (Plus 우선)

5. **ProjectMediaModule** 신규

6. **DTO 보강**
   - ProjectListQueryDto (필터/정렬/페이지네이션 통합)
   - ProjectDetailResponseDto (미디어/기관 정보 포함)

---

## Phase 1-C: FavoriteProject CRUD

**목적**: 좋아요 기능의 리포지토리/서비스/모듈 완성 (기존 Phase 4에서 앞당김)
**의존성**: Phase 0 (완료)

### 작업 항목

1. **FavoriteProjectsRepository 구현**
   - `findByUser`, `create`, `delete`, `exists`

2. **FavoriteProjectsService 구현**
   - 좋아요 추가/삭제/조회/존재 확인

3. **FavoriteProjectsModule** — DI 설정

4. **DTO 보강**
   - 기존 인터페이스 → class + Swagger 데코레이터

---

## Phase 2: Donation Flow (Mock 결제)

**목적**: 기부자가 기부하고 결과를 확인하는 전체 플로우
**의존성**: Phase 1-A (Organization 존재) + Phase 1-B (Project 존재)

### 작업 항목

1. **DonationsRepository 구현**
   - 전체 CRUD + `findByUser`, `findByProject`, `findByTransactionHash`, `getTotalByProject`

2. **DonationsService 구현**
   - 기부 생성 (결제 요청), 상태 변경, 내역 조회, 통계

3. **DonationsController**
   - `POST /api/donations` — 기부 생성
   - `GET /api/donations` — 기부 내역 리스트
   - `GET /api/donations/:id` — 기부 상세
   - `GET /api/donations/user/:userId` — 사용자별 기부 내역
   - `GET /api/donations/project/:projectId` — 프로젝트별 기부 내역

4. **Mock Payment Service**
   - Alchemy Pay checkout URL 생성 mock
   - Webhook 시뮬레이션 (Paid/Failed/Expired)
   - Interface 기반 (나중에 실제 서비스로 교체)

5. **Mock Blockchain Service**
   - Tx Hash 생성 mock
   - 분배(95%/5%) 기록 mock
   - Interface 기반 (나중에 XRPL로 교체)

6. **Webhook Controller**
   - `POST /api/webhooks/alchemy-pay`

7. **DonationsModule** — DI 설정

---

## Phase 3: 마이페이지 & 사용자 상호작용

**목적**: 기부자/기관 마이페이지 API 완성
**의존성**: Phase 2 (Donation 존재)

> FavoriteProject 구현이 Phase 1-C로 이동했으므로, 컨트롤러 통합에 집중

### 작업 항목

1. **기부자 마이페이지 API**
   - `GET /api/me/donations` — 내 기부 내역
   - `GET /api/me/favorites` — 좋아요 캠페인 리스트
   - `POST /api/me/favorites/:projectId` — 좋아요 추가
   - `DELETE /api/me/favorites/:projectId` — 좋아요 삭제
   - `GET /api/me/wallet` — 지갑 정보
   - `PATCH /api/me/wallet` — 지갑 변경
   - `GET /api/me/profile` — 내 계정 정보
   - `PATCH /api/me/profile` — 계정 정보 수정

2. **기관 마이페이지 API**
   - `GET /api/org/dashboard` — 대시보드 (Free: 일반, Plus: 고급)
   - `GET /api/org/donations` — 기부 수령 내역
   - `GET /api/org/donations/:id` — 기부 수령 상세
   - `GET /api/org/plan` — 현재 플랜 정보
   - `POST /api/org/plan/upgrade` — Plus 구독 (Mock)
   - `POST /api/org/plan/cancel` — 구독 해지

3. **기부 증명서**
   - `GET /api/donations/:id/certificate` — 기부 증명서 데이터 생성

4. **기부 상세 보강**
   - Tx hash, 블록체인 링크, 분배 구조, 수수료 표시

---

## Phase 4: 관리자 & 정산

**목적**: 플랫폼 운영에 필요한 관리자 기능
**의존성**: Phase 1~3

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

---

## Phase 5: 실제 외부 연동

**목적**: Mock 서비스를 실제 외부 서비스로 교체
**의존성**: Phase 2, Phase 4

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

---

## 참조 문서

- `docs/plans/2026-02-18-feature-priority-design.md` — 원본 계획
- `ia/request_hub.md` — 비즈니스 요구사항
