# Donor Platform — Project Specification (SPEC)

> This document provides project-specific context for Legacy Analysis.
> Generated: 2026-02-18 | Auto-scanned + manually supplemented

---

## 1. Project Overview

- **System name**: Donor Platform
- **Purpose**: 기부자와 자선 프로젝트를 블록체인(크립토) 기반으로 연결하는 투명한 기부 중개 플랫폼. 사용자는 암호화폐(USDC, ETH, BTC, MATIC)로 자선 프로젝트에 기부할 수 있으며, 블록체인 트랜잭션을 통해 기부금의 투명한 추적이 가능하다.
- **Current status**: 초기 개발 중 (MVP)
- **Reason for analysis**: 프로젝트 문서화

---

## 2. Tech Stack

| Category  | Technology                        | Version  | Notes                              |
| --------- | --------------------------------- | -------- | ---------------------------------- |
| Language  | TypeScript                        | 5.9      | target: ES2021, module: commonjs   |
| Runtime   | Node.js                           | -        | (⚠️ 자동 감지 - engines 미지정)      |
| Framework | NestJS (Express)                  | 11.1.12  |                                    |
| ORM       | Prisma                            | 7.2.0    | prisma-client, adapter-mariadb     |
| DB        | MySQL                             | 8.0      | Docker container (`donation_mysql`)|
| Auth      | Passport (Google OAuth2 + JWT)    | 0.7.0    | + bcrypt, CryptoService 암호화      |
| Validation| class-validator, zod              | 0.14 / 4.3|                                   |
| Docs      | Swagger (@nestjs/swagger)         | 11.2.5   | Endpoint: `/api-docs`              |
| Build     | NestJS CLI (nest build)           | 11.0.16  | Multi-module: N                    |
| Test      | Jest + ts-jest + supertest        | 30.2.0   |                                    |
| VCS       | Git                               |          |                                    |

### Key Dependencies

| Package                   | Purpose                        |
| ------------------------- | ------------------------------ |
| `@nestjs/jwt`             | JWT 토큰 발급/검증              |
| `@nestjs/passport`        | 인증 전략 통합                  |
| `passport-google-oauth20` | Google OAuth2 로그인            |
| `passport-jwt`            | JWT 인증 전략                   |
| `bcrypt`                  | 비밀번호 해시                   |
| `cookie-parser`           | Refresh Token 쿠키 파싱         |
| `helmet`                  | HTTP 보안 헤더 (미사용 확인 필요)|
| `mysql2`                  | MySQL 드라이버                  |
| `rxjs`                    | NestJS 내부 리액티브 처리       |

---

## 3. Directory Structure

```
project-root/
├── prisma/
│   └── schema.prisma                    # DB 스키마 정의
├── src/
│   ├── main.ts                          # 앱 부트스트랩 (포트 3000)
│   ├── app.module.ts                    # 루트 모듈
│   ├── application/                     # ★ 애플리케이션 레이어
│   │   ├── dto/                         # DTO + 응답 매퍼 함수
│   │   └── service/                     # 서비스 구현 + 인터페이스
│   ├── common/                          # 공통 유틸
│   │   ├── decorators/                  # @Public() 등 커스텀 데코레이터
│   │   └── filters/                     # HttpExceptionFilter
│   ├── docs/                            # database.dbml (ERD)
│   ├── domain/                          # ★ 도메인 레이어 (프레임워크 독립)
│   │   ├── constants/                   # 공유 상수
│   │   ├── entity/                      # 도메인 엔티티 클래스
│   │   ├── enums/                       # 상태/타입 enum
│   │   └── repository/                  # 리포지토리 인터페이스
│   ├── generated/prisma/                # ⛔ Prisma 자동생성 (편집 금지)
│   ├── infrastructure/                  # ★ 인프라 레이어
│   │   ├── auth/                        # JWT/Google 전략 + Guard
│   │   ├── configuration/               # 설정
│   │   ├── crypto/                      # 토큰 암/복호화 서비스
│   │   └── persistence/                 # Prisma 리포지토리 구현체
│   │       ├── adapter/                 # 리포지토리 어댑터
│   │       └── prisma/                  # PrismaService + PrismaModule
│   ├── modules/                         # NestJS 모듈 정의
│   ├── presentation/                    # ★ 프레젠테이션 레이어
│   │   └── controller/                  # REST 컨트롤러
│   └── types/                           # 타입 정의
├── docker-compose.yml                   # MySQL 8.0 컨테이너
├── package.json
└── tsconfig.json
```

> ★ = 분석 대상 주요 레이어

---

## 4. Analysis Target Modules

### Module: Auth (`/api/auth`)

- **Path**: `src/modules/auth.module.ts`
- **Role**: Google OAuth2 소셜 로그인 + JWT 기반 인증/인가
- **Entry point**: `AuthController` (`src/presentation/controller/auth.controller.ts`)
- **Key classes**:
  - `AuthController` — OAuth 플로우 + 토큰 갱신 엔드포인트
  - `AuthService` — 사용자 검증, JWT 발급, Refresh Token 관리
  - `GoogleStrategy` — Google OAuth2 Passport 전략
  - `JwtStrategy` — JWT 검증 (암호화된 토큰 복호화 포함)
  - `JwtAuthGuard` — 글로벌 JWT 인증 Guard (`@Public()` 데코레이터로 우회)
  - `CryptoService` — JWT 토큰 암/복호화
- **Endpoints**:

  | Method | Path                          | Auth     | Description                    |
  | ------ | ----------------------------- | -------- | ------------------------------ |
  | GET    | `/auth/google`                | Public   | Google OAuth2 로그인 시작       |
  | GET    | `/auth/google/callback`       | Public   | OAuth 콜백 → JWT 발급          |
  | GET    | `/auth/login/success/:token`  | -        | 로그인 성공 페이지 (데모용)     |
  | GET    | `/auth/login/failure`         | -        | 로그인 실패 페이지             |
  | GET    | `/auth/protected`             | JWT      | 보호된 엔드포인트 테스트        |
  | POST   | `/auth/refresh`               | Public   | Refresh Token → 새 토큰 발급   |

- **Known quirks**: Refresh Token은 현재 In-memory Map에 저장됨 (TODO: DB/Redis 이전 필요)

### Module: Users (`/api/users`)

- **Path**: `src/modules/users.module.ts`
- **Role**: 사용자 등록, 이메일 로그인, 사용자 정보 조회
- **Entry point**: `UserController` (`src/presentation/controller/user.controller.ts`)
- **Key classes**:
  - `UserController` — 회원가입, 로그인, 정보 조회
  - `UserService` → `IUsersRepository`
  - `UserEntity` — 사용자 도메인 엔티티 (toPublicJSON: passwordHash 제외)
- **Endpoints**:

  | Method | Path              | Auth   | Description          |
  | ------ | ----------------- | ------ | -------------------- |
  | POST   | `/users/register` | JWT    | 이메일 회원가입       |
  | POST   | `/users/login`    | JWT    | 이메일 로그인         |
  | GET    | `/users/info`     | JWT    | 현재 사용자 정보 조회  |

- **Known quirks**: `register`/`login`에 `@Public()` 데코레이터 미적용 — JWT Guard에 의해 차단될 수 있음 (⚠️ 확인 필요)

### Module: Projects (`/api/projects`)

- **Path**: `src/modules/projects.module.ts`
- **Role**: 기부 프로젝트(캠페인) CRUD
- **Entry point**: `ProjectController` (`src/presentation/controller/project.controller.ts`)
- **Key classes**:
  - `ProjectController` — 프로젝트 목록/상세/생성
  - `ProjectService` (`IProjectsService`) → `IProjectsRepository`
  - `ProjectEntity` — `getFundingPercentage()`, `isGoalReached()` 비즈니스 로직 포함
- **Endpoints**:

  | Method | Path             | Auth | Description         |
  | ------ | ---------------- | ---- | ------------------- |
  | GET    | `/projects`      | JWT  | 프로젝트 목록 (필터) |
  | GET    | `/projects/:id`  | JWT  | 프로젝트 상세 조회   |
  | POST   | `/projects`      | JWT  | 프로젝트 생성        |

- **Known quirks**: `@ApiExcludeController()` — Swagger에서 숨김 상태. Update/Delete 엔드포인트는 서비스에 구현되어 있으나 컨트롤러에 미노출

### Module: CommonCode (`/api/common`)

- **Path**: `src/modules/common-code.module.ts`
- **Role**: 공통 코드(국가, 필터 등) 관리
- **Entry point**: `CommonCodeController` (`src/presentation/controller/common-code.controller.ts`)
- **Key classes**:
  - `CommonCodeController` — 그룹별 코드 조회
  - `CommonCodeService` → `ICommonCodeRepository` + `IGroupCodeRepository`
- **Endpoints**:

  | Method | Path                         | Auth | Description           |
  | ------ | ---------------------------- | ---- | --------------------- |
  | GET    | `/common/codes/:groupCode`   | JWT  | 그룹별 공통 코드 조회  |

- **Known quirks**: `@ApiExcludeController()` — Swagger에서 숨김 상태

### 미구현 모듈 (리포지토리 인터페이스만 존재)

| Module            | Interface                      | Status              |
| ----------------- | ------------------------------ | ------------------- |
| Donations         | `IDonationsRepository`         | 인터페이스만 존재    |
| Organizations     | `IOrganizationsRepository`     | 인터페이스만 존재    |
| ProjectMedia      | `IProjectMediaRepository`      | 인터페이스만 존재    |
| FavoriteProjects  | `IFavoriteProjectsRepository`  | 인터페이스만 존재    |

---

## 5. Database

### Key Tables

| Table              | Role                        | Key Columns                                                     | Notes                                |
| ------------------ | --------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| `users`            | 사용자 정보                  | user_id, email, password_hash, login_platform, wallet_address   | email UNIQUE, wallet_address UNIQUE  |
| `organizations`    | 기부 수령 기관               | org_id, name, registration_number, wallet_address               | registration_number UNIQUE           |
| `beneficiaries`    | 개인 수혜자                  | beneficiary_id, name, bio, wallet_address, is_verified          | wallet_address UNIQUE                |
| `projects`         | 기부 프로젝트/캠페인         | project_id, org_id, beneficiary_id, nation, title, goal_amount, current_raised_usdc, status | org_id OR beneficiary_id 연결 |
| `donations`        | 기부 내역(트랜잭션)          | donation_id, user_id, project_id, coin_amount, coin_type, transaction_hash, status | transaction_hash UNIQUE    |
| `project_media`    | 프로젝트 미디어              | media_id, project_id, media_url, media_type, content_type       |                                      |
| `favorite_projects`| 관심 프로젝트 (M:N)         | user_id, project_id                                              | 복합 PK (user_id + project_id)       |
| `TB_GROUP_CODE`    | 공통 코드 그룹               | group_code, group_name, use_yn                                   | PK: group_code                       |
| `TB_COMMON_CODE`   | 공통 코드 상세               | group_code, code_id, code_name, code_name_ko, sort_order         | 복합 PK (group_code + code_id)       |

### ERD

```
organizations (1) ──── (N) projects
beneficiaries (1) ──── (N) projects
projects (1) ──── (N) donations
projects (1) ──── (N) project_media
projects (1) ──── (N) favorite_projects

users (1) ──── (N) donations
users (1) ──── (N) favorite_projects

TB_GROUP_CODE (1) ──── (N) TB_COMMON_CODE
```

> 상세 ERD: `src/docs/database.dbml` (DBML 형식)

### Known State Values

| Table.Column       | Value       | Meaning              |
| ------------------ | ----------- | -------------------- |
| projects.status    | `Active`    | 모금 진행 중           |
| projects.status    | `Completed` | 프로젝트 완료          |
| projects.status    | `Funded`    | 목표 금액 달성         |
| projects.status    | `Paused`    | 모금 일시 중지         |
| projects.status    | `Cancelled` | 프로젝트 취소          |
| donations.status   | `Pending`   | 기부 처리 대기         |
| donations.status   | `Confirmed` | 기부 확인 완료         |
| donations.status   | `Failed`    | 기부 실패              |
| donations.status   | `Refunded`  | 환불 처리              |

### Enum Definitions

| Enum            | Values                            | Usage                |
| --------------- | --------------------------------- | -------------------- |
| CoinType        | USDC, ETH, BTC, MATIC            | 기부 코인 종류        |
| FiatCurrency    | KRW, USD, EUR, JPY               | 법정 화폐 단위        |
| MediaType       | Image, Video                     | 미디어 파일 유형       |
| ContentType     | Pre-donation, Post-impact        | 콘텐츠 시점 구분       |
| LoginPlatform   | Email, Google, Kakao, Apple      | 로그인 플랫폼         |

---

## 6. External Integrations

| System              | Protocol | Purpose                           | Notes                                    |
| ------------------- | -------- | --------------------------------- | ---------------------------------------- |
| Google OAuth2       | HTTPS    | 소셜 로그인 (사용자 인증)          | passport-google-oauth20 사용              |
| Blockchain (TBD)    | [TODO]   | 기부 트랜잭션 기록/검증            | [TODO: 추후 확인 필요] — 현재 코드에 없음  |

> ⚠️ 블록체인 연동 코드가 아직 없으며, `transactionHash` 필드만 DB에 존재. 실제 블록체인 트랜잭션 생성/검증 로직은 미구현 상태.

---

## 7. Glossary

| Term               | Definition                                                  | Code Representation                                  |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------------------- |
| Donor (기부자)      | 플랫폼을 통해 암호화폐로 기부하는 사용자                      | `User`, `users` 테이블                                |
| Organization (기관) | 기부를 수령하는 자선 단체/기관                                | `Organization`, `organizations` 테이블                |
| Beneficiary (수혜자)| 직접 기부를 받는 개인 수혜자                                  | `Beneficiary`, `beneficiaries` 테이블                 |
| Project (프로젝트)  | 특정 목적의 기부 모금 캠페인                                  | `Project`, `projects` 테이블                          |
| Donation (기부)     | 사용자의 암호화폐 기부 트랜잭션                               | `Donation`, `donations` 테이블                        |
| USDC               | USD에 1:1 페깅된 스테이블코인 (기본 기부 화폐)                 | `CoinType.USDC`, `current_raised_usdc`               |
| Wallet Address      | 블록체인 지갑 주소 — 기부 송/수신에 사용                      | `walletAddress`, `wallet_address`                     |
| Transaction Hash    | 블록체인 트랜잭션 고유 식별자                                 | `transactionHash`, `transaction_hash`                 |
| Common Code         | 드롭다운/필터용 공통 코드 시스템                              | `GroupCode` + `CommonCode`, `TB_GROUP_CODE` + `TB_COMMON_CODE` |
| Funding Percentage  | 목표 대비 현재 모금 비율                                      | `ProjectEntity.getFundingPercentage()`                |

---

## 8. Architecture Notes

### Clean/Hexagonal Architecture

```
Presentation (Controller)
    ↓
Application (Service + DTO)
    ↓
Domain (Entity + Repository Interface + Enum)
    ↑
Infrastructure (Prisma Adapter + Auth + Crypto)
```

- **Domain 레이어**: 프레임워크 의존성 없음. 순수 TypeScript 클래스
- **DI 패턴**: 리포지토리는 문자열 토큰으로 주입 (`@Inject('IProjectsRepository')`)
- **엔티티 패턴**: 불변 클래스 (`readonly` props) + `static create()` 팩토리 + `toJSON()` 직렬화
- **응답 형식**: `{ success: true, data: ... }` + 전역 prefix `/api`
- **인증 흐름**: 글로벌 `JwtAuthGuard` → `@Public()` 데코레이터로 퍼블릭 엔드포인트 지정
- **토큰 암호화**: JWT 토큰을 `CryptoService`로 AES 암호화하여 클라이언트에 전달

### Path Aliases

| Alias              | Target                              |
| ------------------ | ----------------------------------- |
| `@/*`              | `src/*`                             |
| `@domain/*`        | `src/domain/*`                      |
| `@configuration/*` | `src/infrastructure/configuration/*`|
| `@schemas/*`       | `src/schemas/*`                     |

---

## 9. Known Issues / History

| Date      | Description                                              | Related Module | Notes                                       |
| --------- | -------------------------------------------------------- | -------------- | ------------------------------------------- |
| 현재      | Refresh Token이 In-memory Map 저장                       | Auth           | 서버 재시작 시 모든 세션 무효화됨             |
| 현재      | `UserController.register/login`에 `@Public()` 미적용     | Users          | JWT Guard에 의해 비로그인 사용자 차단 가능성   |
| 현재      | `ProjectController`, `CommonCodeController` Swagger 숨김 | Projects/Common| `@ApiExcludeController()` 적용됨              |
| 현재      | Donations/Organizations/Media/Favorites 미구현           | 다수           | 리포지토리 인터페이스만 존재, 어댑터 미구현    |
| 현재      | 블록체인 연동 미구현                                      | Donations      | transaction_hash 필드만 존재, 실제 연동 없음   |
| 현재      | `helmet` 미들웨어 미적용                                  | Infrastructure | 의존성만 설치됨, `main.ts`에서 미사용          |

---

## 10. Analysis Requests

- [ ] Auth 모듈의 전체 인증/인가 흐름 분석 (Google OAuth → JWT 발급 → 암호화 → 갱신)
- [ ] Donations 모듈 구현 시 블록체인 트랜잭션 연동 아키텍처 설계
- [ ] `@Public()` 데코레이터 누락 엔드포인트 검토
- [ ] 리포지토리 어댑터 미구현 목록 확인 및 구현 우선순위 결정
