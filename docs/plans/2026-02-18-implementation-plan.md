# Donor 백엔드 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 크립토 기부 플랫폼 Donor의 백엔드 API를 Phase 0~6까지 단계적으로 구현한다.

**Architecture:** NestJS Clean/Hexagonal Architecture. 도메인 레이어(엔티티/리포지토리 인터페이스)는 프레임워크 무관, 인프라 레이어(Prisma 구현체)에서 실제 DB 접근, 프레젠테이션 레이어(컨트롤러)에서 HTTP 처리. DI는 string token 기반.

**Tech Stack:** TypeScript 5.9, NestJS 11, Prisma 7 + MySQL 8.0, Passport (JWT+Google OAuth2), class-validator, Swagger, Jest

---

## Phase 목차

| Phase | 제목 | 파일 | Task 수 |
|-------|------|------|---------|
| 0 | [스키마 확장 & 공통 인프라](./phase-0-schema-infra.md) | `phase-0-schema-infra.md` | 6 |
| 1 | [Organization CRUD (기관 입점)](./phase-1-organization-crud.md) | `phase-1-organization-crud.md` | 4 |
| 2 | [Project(Campaign) CRUD](./phase-2-project-crud.md) | `phase-2-project-crud.md` | 3 |
| 3 | [Donation Flow (기부 핵심)](./phase-3-donation-flow.md) | `phase-3-donation-flow.md` | 5 |
| 4 | [마이페이지 & 사용자 상호작용](./phase-4-mypage.md) | `phase-4-mypage.md` | 3 |
| 5 | [관리자 & 정산](./phase-5-admin.md) | `phase-5-admin.md` | 1 |
| 6 | [외부 연동 계획 (Alchemy Pay + XRPL)](./phase-6-external.md) | `phase-6-external.md` | — |

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

---

## Phase 의존성 그래프

```
Phase 0 (스키마 & 인프라)
  ├── Phase 1 (Organization CRUD)
  │     ├── Phase 2 (Project CRUD)
  │     ├── Phase 4 (마이페이지) ← Phase 3도 필요
  │     └── Phase 5 (관리자) ← Phase 3도 필요
  └── Phase 3 (Donation Flow) ← Phase 2도 필요
        └── Phase 6 (외부 연동)
```

## 현재 프로젝트 상태 요약

- User/Organization Entity에 role, planType, status 등 **미구현**
- ProjectRepository **전체 스텁 상태**
- Organization, Donation, FavoriteProject, ProjectMedia 리포지토리 **미구현**
- Organization, Donation, MyPage, Admin 컨트롤러/모듈 **미구현**
- RolesGuard, @Roles 데코레이터 **미구현**
