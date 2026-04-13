# Clinic SaaS — Backend API

Production-oriented multi-tenant clinic platform backend (Node.js, TypeScript, Express, PostgreSQL, Prisma). The API follows **Clean Architecture** with a **repository pattern**, JWT authentication in **HTTP-only cookies**, and **row-level isolation** via a mandatory `tenantId` on tenant-scoped data.

> **Note on tenancy:** The product PRD describes PostgreSQL schema-per-tenant isolation. This implementation uses a **shared database** with a **`tenant_id` column** on every tenant-bound table, with all repository queries scoped by `tenantId`, matching your stated requirements.

## Features

- **Auth:** Register (admin / doctor / patient), login, refresh, logout, forgot/reset password, change password (invalidates refresh tokens via `tokenVersion`).
- **Finance (PRD v3):** Expense categories & subcategories, expenses with validation, monthly statement generation with doctor snapshots and expense breakdown, external income, finalize statement.
- **Admin:** List tenants, activate/deactivate tenant.
- **Security:** bcrypt (configurable rounds ≥10), Helmet, global + auth rate limits, 10kb JSON body limit, Zod validation, basic text sanitization, centralized errors (no stack traces in production).

## Requirements

- Node.js 20+
- PostgreSQL 16+ (or Docker)

## Local development

1. Copy environment file:

   ```bash
   cp .env.example .env
   ```

   Set long random values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `ADMIN_SECRET_KEY` (each ≥32 characters for JWT secrets).

2. Start PostgreSQL (or use Docker only for DB):

   ```bash
   docker compose up -d postgres
   ```

3. Install dependencies and run migrations:

   ```bash
   npm install
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

   Health check: `GET http://localhost:3000/health`

## API documentation (Swagger)

- **Swagger UI:** `http://localhost:3000/api-docs`
- **OpenAPI JSON:** `http://localhost:3000/openapi.json`

After logging in (cookies), use **Try it out** from the same browser, or click **Authorize** and paste a JWT as a Bearer token. Finance routes accept optional `X-Tenant-Id` when your user belongs to multiple clinics.

## Docker (API + PostgreSQL)

```bash
cp .env.example .env
# Edit .env — set JWT_* and ADMIN_SECRET_KEY for production
docker compose up --build
```

The API runs migrations on startup (`prisma migrate deploy`) then listens on port **3000**.

## API base URL

- Base path: `/api/v1`
- Auth routes: `/api/v1/auth/*`
- Finance routes: `/api/v1/*` (expenses, statements, external income)
- Admin: `/api/v1/admin/*`

### Cookies

- `access_token` — JWT (short-lived).
- `refresh_token` — opaque random token (stored hashed server-side).

Send requests with `credentials: 'include'` from browsers. For tools like curl, pass `Cookie:` headers after login.

### Tenant context

- **`X-Tenant-Id` header** (optional for doctors with multiple clinics): selects the active clinic.
- JWT also carries `tenantId` after login.

### Example: register doctor

```http
POST /api/v1/auth/register/doctor
Content-Type: application/json

{
  "fullName": "Dr. Example",
  "email": "doc@example.com",
  "password": "securepass123",
  "clinicName": "Example Clinic",
  "slug": "example-clinic"
}
```

### Example: login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "doc@example.com",
  "password": "securepass123"
}
```

## Project layout

```
src/
  application/     # Use cases & application services
  config/          # Env, logging
  domain/          # Entities, repository interfaces, domain errors
  infrastructure/  # Prisma, repository implementations, security helpers
  interfaces/http/ # Express routes, HTTP schemas (Zod)
  middleware/
  types/
prisma/
  schema.prisma
  migrations/
```

## Scripts

| Script            | Description                |
|-------------------|----------------------------|
| `npm run dev`     | Dev server with `tsx watch` |
| `npm run build`   | Compile to `dist/`         |
| `npm start`       | Run `dist/server.js`       |
| `npm run db:migrate` | `prisma migrate deploy` |

## Roadmap (from PRD)

Additional modules can be added in the same layers: appointments, work hours, public booking, staff, notifications — tables and enums are already present in `schema.prisma` for most operational entities.

## License

Proprietary — internal use per PRD.
