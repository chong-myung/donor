# Project: Donor

NestJS backend API for a crypto donation platform connecting donors with charitable projects.

## Tech Stack

- TypeScript 5.9, Node.js (ES2021 target)
- NestJS 11 (Express)
- Prisma 7 with MySQL 8.0 (Docker)
- Auth: Passport (Google OAuth2 + JWT), bcrypt
- Validation: class-validator, zod
- Docs: Swagger (`/api-docs`)
- Testing: Jest + ts-jest + supertest
- No linter/formatter config — no eslint or prettier

## Project Structure

- `src/domain/entity/`: Domain entity classes with static `create()` and `toJSON()`
- `src/domain/repository/`: Repository interfaces (e.g., `IProjectsRepository`)
- `src/domain/enums/`: Enum definitions (status, coin type, currency, etc.)
- `src/domain/constants/`: Shared constants
- `src/application/service/`: Service implementations + service interfaces
- `src/application/dto/`: DTOs with Swagger decorators + response mapper functions
- `src/infrastructure/persistence/adapter/`: Prisma repository implementations
- `src/infrastructure/persistence/prisma/`: PrismaService and PrismaModule
- `src/infrastructure/auth/`: JWT/Google strategies and guards
- `src/presentation/controller/`: REST controllers
- `src/modules/`: NestJS module definitions
- `src/generated/prisma/`: Auto-generated Prisma client (do not edit)
- `prisma/schema.prisma`: Database schema

## Commands

- `npm run start:dev`: Dev server with watch mode (port 3000)
- `npm run build`: Production build
- `npm test`: Run Jest tests
- `npm run db:migrate`: Run Prisma migrations
- `npm run db:push`: Push schema to DB without migration
- `npm run db:studio`: Open Prisma Studio
- `docker compose up -d`: Start MySQL container

## Coding Standards

- **Architecture**: Clean/Hexagonal — domain has no framework imports
- **DI**: Repositories injected via string tokens (`@Inject('IProjectsRepository')`)
- **Entities**: Immutable classes with `readonly` props, `static create()`, `toJSON()`
- **DTOs**: Use `@ApiProperty`/`@ApiPropertyOptional` from `@nestjs/swagger`
- **Response mappers**: Export functions like `toProjectList()` in DTO files
- **API response format**: `{ success: true, data: ... }` with global prefix `/api`
- **Auth**: Global `JwtAuthGuard`; use `@Public()` decorator for open endpoints
- **Prisma schema**: `@map()` for snake_case DB columns, camelCase in TypeScript
- **Path aliases**: `@/*` → `src/*`, `@domain/*`, `@configuration/*`, `@schemas/*`
- **Commit messages**: Korean, prefixed with type (e.g., `Feature:`, `REFACTOR:`)

## Workflow Rules

- IMPORTANT: Never edit files in `src/generated/` — run `npx prisma generate` instead
- IMPORTANT: `.env` contains DB credentials and OAuth secrets — never commit it
- Env vars needed: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `JWT_SECRET`
- Many repository methods are stubbed (`throw new Error('Method not implemented.')`) — implement as needed
