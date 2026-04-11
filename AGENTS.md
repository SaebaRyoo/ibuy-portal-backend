# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Key Non-Obvious Details

- **Package manager**: pnpm (not npm/yarn, despite yarn.lock existing)
- **Database**: PostgreSQL (not MySQL) via TypeORM with `synchronize: true` and `autoLoadEntities: true`
- **Env files**: `.env.dev` for development, `.env` for production — selected by `NODE_ENV` in `src/app.module.ts`
- **API versioning**: All routes prefixed with `/v1/` via URI versioning (`main.ts` sets `defaultVersion: '1'`)
- **Port**: Hardcoded `8000`, listens on `0.0.0.0`
- **Auth**: Global `AuthGuard` via `APP_GUARD` — all routes require JWT by default. Use `@Public()` decorator from `src/common/decorators/metadata/public.decorator.ts` to skip auth
- **Response format**: `TransformInterceptor` unwraps controller return values — controllers must return `Result<T>` instances (`src/common/utils/Result.ts`) with `{data, code, message}` shape
- **Business exceptions**: Use `BusinessException` from `src/common/filters/business.exception.filter.ts` (returns HTTP 200 with error code in body, not HTTP error status)
- **ID generation**: Custom Snowflake `IDWorker` at `src/common/utils/IDWorker.ts` — use this instead of auto-increment for distributed IDs
- **Password hashing**: Uses `bcryptjs` (pure JS, not native `bcrypt`)
- **Imports**: Use `src/` absolute paths (tsconfig `baseUrl: "./"`)
- **Redis**: Uses `@nestjs-modules/ioredis`, connects to db index 1 (not default 0)
- **tsconfig**: `strictNullChecks: false`, `noImplicitAny: false` — loose type checking

## Commands

- `pnpm run start:dev` — dev server with watch
- `pnpm run build` — production build
- `pnpm test` — run unit tests (jest, spec files colocated with source)
- `pnpm run test:e2e` — e2e tests via `test/jest-e2e.json`
