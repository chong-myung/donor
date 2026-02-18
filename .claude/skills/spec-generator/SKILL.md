---
name: spec-generator
description: 프로젝트 코드베이스를 자동 스캔하여 Legacy Analysis용 SPEC.md를 생성하는 스킬. 프로젝트 경로만 제공하면 언어/프레임워크 감지, 디렉토리 구조 분석, 엔트리포인트 추출, DB/외부 연동 탐지를 자동으로 수행하고, 부족한 정보는 사용자에게 질문하여 완성한다.
---

# SPEC Generator Skill

프로젝트 코드베이스를 스캔하여 Legacy Analysis용 SPEC.md를 자동 생성하는 스킬.

## 개요

이 스킬은 두 단계로 동작한다:

1. **자동 스캔 (Phase 1)**: 프로젝트 디렉토리를 분석하여 최대한 많은 정보를 자동 추출
2. **대화형 보완 (Phase 2)**: 자동으로 채울 수 없는 항목을 사용자에게 질문하여 완성

## 실행 절차

### Step 0: 입력 확인

사용자로부터 다음을 확인한다:
- **프로젝트 경로** (필수): 분석할 프로젝트의 루트 디렉토리
- **SPEC.md 저장 경로** (선택): 미지정 시 프로젝트 루트에 `SPEC.md`로 저장
- **분석 범위** (선택): 특정 모듈만 분석할 경우 지정

### Step 1: 자동 스캔 실행

`scripts/scan-project.sh`를 실행하여 프로젝트를 분석한다.

```bash
bash /path/to/spec-generator/scripts/scan-project.sh <project-root>
```

스캔 스크립트는 JSON 형태로 다음 정보를 출력한다:
- `language`: 감지된 언어 및 버전
- `framework`: 감지된 프레임워크
- `build_tool`: 빌드 도구
- `db`: 데이터베이스 설정
- `directory_structure`: 디렉토리 트리
- `modules`: 감지된 모듈 목록
- `entry_points`: 컨트롤러/라우터/엔트리포인트 클래스
- `sql_mappers`: SQL 매퍼 파일 목록
- `external_integrations`: 외부 연동 힌트 (HTTP client, MQ 설정 등)
- `tables`: 코드에서 참조된 테이블명
- `config_files`: 주요 설정 파일 목록

### Step 2: 스캔 결과 해석 및 코드 심층 분석

스캔 스크립트의 JSON 출력을 파싱한 후, 추가로 다음을 수행한다:

#### 2-1. 엔트리포인트 분석
- 감지된 컨트롤러/라우터 파일을 직접 읽고 주요 메서드 추출
- 각 메서드의 HTTP 매핑, 파라미터, 반환 타입 파악

#### 2-2. 서비스 레이어 추적
- 엔트리포인트에서 호출하는 서비스 클래스 식별
- 서비스 → DAO/Repository → SQL 매퍼 흐름 추적

#### 2-3. 도메인 용어 추출
- 클래스명, 메서드명, 테이블명에서 도메인 용어 후보 추출
- enum, 상수, 상태값 정의 파악

#### 2-4. 외부 연동 상세 분석
- REST/SOAP 클라이언트 설정 파일 분석
- 메시지 큐 설정 분석
- DB Link / 외부 DB 연결 설정 확인

### Step 3: 대화형 보완

자동 스캔으로 채울 수 없는 항목을 사용자에게 질문한다.
한 번에 최대 3개 질문씩 묶어서 진행한다.

#### 반드시 질문할 항목:
- **시스템 이름**: 코드만으로는 비즈니스 명칭을 알 수 없음
- **시스템 목적**: 이 시스템이 해결하는 비즈니스 문제
- **현재 상태**: Production / Maintenance / 부분 운영
- **분석 이유**: 마이그레이션, 문서화, 인수인계 등
- **분석 요청 사항**: 특별히 알고 싶은 것

#### 조건부 질문 항목 (자동 감지 실패 시):
- DB 버전 (설정에서 추출 불가한 경우)
- 외부 시스템 이름 및 프로토콜 (코드 힌트가 부족한 경우)
- 용어 정의 (도메인 특수 용어가 발견된 경우)
- 알려진 이슈/히스토리

### Step 4: SPEC.md 생성

`templates/spec-template.md`를 기반으로 수집된 정보를 채워 SPEC.md를 생성한다.

#### 생성 규칙:
1. 자동 스캔 결과를 먼저 채움
2. 사용자 답변으로 보완
3. 채우지 못한 항목은 `[TODO: 추후 확인 필요]`로 표시
4. 확신도가 낮은 항목은 `(⚠️ 자동 감지 - 확인 필요)` 주석 추가

### Step 5: 검토 및 확정

생성된 SPEC.md를 사용자에게 보여주고:
1. 전체 내용 검토 요청
2. 수정/보완 사항 반영
3. 최종 파일 저장

---

## 언어별 감지 전략

### Java
| 항목 | 감지 소스 |
|------|----------|
| 버전 | `pom.xml` (java.version, maven.compiler.source), `build.gradle` (sourceCompatibility) |
| 프레임워크 | `pom.xml`/`build.gradle` 의존성 (spring-boot, spring-framework) |
| ORM | 의존성 (mybatis, hibernate, jpa) + mapper XML 존재 여부 |
| DB | `application.yml`/`application.properties` (spring.datasource.url) |
| 빌드 | `pom.xml` → Maven, `build.gradle` → Gradle |
| 멀티모듈 | `<modules>` in pom.xml, `include` in settings.gradle |
| 엔트리포인트 | `@Controller`, `@RestController`, `@RequestMapping` |
| SQL 매퍼 | `*Mapper.xml`, `*-mapper.xml` 패턴 |
| 상태값 | enum 클래스, `static final` 상수 |

### C# / .NET
| 항목 | 감지 소스 |
|------|----------|
| 버전 | `.csproj` (TargetFramework) |
| 프레임워크 | `.csproj` 패키지 참조 (Microsoft.AspNetCore, EntityFramework) |
| ORM | Entity Framework, Dapper 참조 |
| DB | `appsettings.json` (ConnectionStrings) |
| 빌드 | `.sln` → MSBuild/dotnet |
| 멀티모듈 | `.sln` 내 프로젝트 목록 |
| 엔트리포인트 | `[ApiController]`, `ControllerBase` 상속, `[HttpGet]` 등 |
| SQL | LINQ 쿼리, Raw SQL, Stored Procedure 호출 |

### Python
| 항목 | 감지 소스 |
|------|----------|
| 버전 | `pyproject.toml`, `setup.py`, `.python-version`, `runtime.txt` |
| 프레임워크 | `requirements.txt`/`pyproject.toml` (django, flask, fastapi) |
| ORM | SQLAlchemy, Django ORM, Tortoise 참조 |
| DB | `settings.py` (DATABASES), `.env`, `alembic.ini` |
| 빌드 | `pyproject.toml` → Poetry/PDM, `setup.py` → setuptools, `Pipfile` → Pipenv |
| 엔트리포인트 | Django: `urls.py` + views, Flask: `@app.route`, FastAPI: `@router` |
| 마이그레이션 | `alembic/`, `migrations/` 디렉토리 |

### TypeScript / JavaScript (Node.js)
| 항목 | 감지 소스 |
|------|----------|
| 버전 | `package.json` (engines.node), `tsconfig.json` (target) |
| 프레임워크 | `package.json` 의존성 (express, nestjs, next, nuxt) |
| ORM | TypeORM, Prisma, Sequelize, Knex 참조 |
| DB | `.env`, `prisma/schema.prisma`, `ormconfig.json` |
| 엔트리포인트 | NestJS: `@Controller`, Express: `router.get/post`, Next.js: `app/api/` |

### Go
| 항목 | 감지 소스 |
|------|----------|
| 버전 | `go.mod` (go directive) |
| 프레임워크 | `go.mod` 의존성 (gin, echo, fiber, chi) |
| DB | 코드 내 `sql.Open`, `gorm.Open` 호출, `.env` 파일 |
| 엔트리포인트 | `func main()`, HTTP 핸들러 등록 |

---

## 파일 구조

```
spec-generator/
├── SKILL.md                    # 이 파일
├── scripts/
│   └── scan-project.sh         # 프로젝트 스캔 스크립트
└── templates/
    └── spec-template.md        # SPEC.md 템플릿
```

---

## 주의사항

1. **민감 정보 필터링**: DB 비밀번호, API 키 등은 SPEC.md에 포함하지 않는다
2. **대용량 프로젝트**: 파일이 1000개 이상인 경우 주요 디렉토리만 스캔
3. **바이너리 파일**: `.class`, `.dll`, `.pyc` 등은 스캔에서 제외
4. **인코딩**: UTF-8이 아닌 파일은 경고 표시 후 스킵
5. **자동 감지 한계**: 프레임워크 버전, DB 버전 등은 설정 파일에 없을 수 있으므로 사용자 확인 필요
