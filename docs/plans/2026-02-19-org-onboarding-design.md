# 기관 입점 신청 및 심사 프로세스 설계

## 개요

DBML에 정의된 `org_applications`, `org_members` 테이블을 Prisma 스키마에 반영하고,
기관 입점 신청 → 심사 → 승인 → Organization + OrgMember 자동 생성 플로우를 구현한다.
기존 Organization.userId (1:1) 구조를 org_members (N:N) 기반으로 전환한다.

## 접근법

Approach A (DBML 그대로 반영) 채택:
- org_applications + org_members 모두 추가
- Organization.userId 제거, org_members로 권한 판단
- OrgMemberGuard 신규 도입

## Prisma 스키마 변경

### 신규 모델

**OrgApplication:**
- applicationId, userId, orgName, registrationNumber, registrationDocUrl
- contactName, contactPhone, contactEmail, description
- status (PENDING/APPROVED/REJECTED), rejectedReason, reviewedAt, createdAt
- User relation

**OrgMember:**
- orgMemberId, orgId, userId, role (ADMIN/MANAGER/VIEWER), joinedAt
- Organization + User relation
- @@unique([orgId, userId])

### 기존 모델 변경

**Organization:**
- userId 필드 + user relation 제거
- description, logoUrl, isVerified 필드 추가
- orgMembers relation 추가

**User:**
- orgApplications, orgMembers relation 추가
- organization relation 제거

## 입점 신청 플로우

```
POST /api/org-applications → status: PENDING
  ↓
GET  /api/admin/applications → 관리자 목록 조회
  ↓
PATCH /api/admin/applications/:id/approve
  → OrgApplication.status = APPROVED
  → Organization 자동 생성
  → OrgMember 자동 생성 (신청자 = ADMIN)

PATCH /api/admin/applications/:id/reject
  → OrgApplication.status = REJECTED + rejectedReason
```

## 엔드포인트

### 사용자
- `POST /api/org-applications` — 입점 신청
- `GET /api/org-applications/my` — 내 신청 내역
- `GET /api/org-applications/:id` — 신청 상세

### 관리자
- `GET /api/admin/applications` — 신청 목록 (status 필터)
- `GET /api/admin/applications/:id` — 신청 상세
- `PATCH /api/admin/applications/:id/approve` — 승인
- `PATCH /api/admin/applications/:id/reject` — 반려

## 권한 체계 변경

- User.role: DONOR / PLATFORM_ADMIN 만 유지
- 기관 소속 여부: org_members 테이블로 판단
- OrgMemberGuard: req.user.userId → org_members 조회 → req.orgMember 부착
- @OrgRoles('ADMIN', 'MANAGER') 데코레이터로 기관 내부 역할 체크
- 기존 @Roles('ORG_ADMIN') → OrgMemberGuard + @OrgRoles 조합으로 교체

## 영향받는 기존 코드

- OrganizationEntity: userId 제거, description/logoUrl/isVerified 추가
- organization.repository.ts: findByUserId 제거, mapToEntity 수정
- organization.service.ts: getOrganizationByUserId → org_members 기반
- organization.dto.ts: userId 제거, description/logoUrl 추가
- org.controller.ts: OrgMemberGuard 적용
- admin.controller.ts: 신청 심사 엔드포인트 추가

## 신규 파일

- Entity: org-application.entity.ts, org-member.entity.ts
- Repository: org-application + org-member (interface + implementation)
- Service: org-application.service.ts
- DTO: org-application.dto.ts, org-member.dto.ts
- Controller: org-application.controller.ts
- Guard: org-member.guard.ts
- Decorator: org-roles.decorator.ts
- Module: org-applications.module.ts
