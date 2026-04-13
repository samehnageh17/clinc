/**
 * OpenAPI 3.0 document for Swagger UI — kept in sync with route handlers under `interfaces/http/routes/`.
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Clinic SaaS API",
    description:
      "Multi-tenant clinic platform REST API. Authentication uses HTTP-only cookies (`access_token`, `refresh_token`) and/or `Authorization: Bearer <jwt>`. Tenant scope for clinic routes: JWT `tenantId` and/or `X-Tenant-Id` header.",
    version: "1.0.0",
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Health", description: "Liveness" },
    { name: "Auth", description: "Registration, login, tokens, password" },
    { name: "Finance", description: "Expenses, statements, external income (tenant-scoped)" },
    { name: "Admin", description: "Platform admin (role: admin)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access JWT from login response cookie or paste token here.",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
      },
    },
    parameters: {
      TenantHeader: {
        name: "X-Tenant-Id",
        in: "header",
        required: false,
        schema: { type: "string", format: "uuid" },
        description: "Active clinic tenant (optional if JWT already contains tenantId).",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
        },
      },
      RegisterAdmin: {
        type: "object",
        required: ["fullName", "email", "password", "adminSecretKey"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          adminSecretKey: { type: "string" },
        },
      },
      RegisterDoctor: {
        type: "object",
        required: ["fullName", "email", "password", "clinicName", "slug"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          phone: { type: "string" },
          clinicName: { type: "string" },
          specialty: { type: "string" },
          primaryColor: { type: "string" },
          secondaryColor: { type: "string" },
          logoUrl: { type: "string" },
          address: { type: "string" },
          timezone: { type: "string" },
          bio: { type: "string" },
          slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
        },
      },
      RegisterPatient: {
        type: "object",
        required: ["fullName", "email", "password", "tenantId"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          phone: { type: "string" },
          dateOfBirth: { type: "string", format: "date" },
          gender: { type: "string", enum: ["male", "female", "other"] },
          tenantId: { type: "string", format: "uuid" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
          tenantId: { type: "string", format: "uuid" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
          role: { type: "string", enum: ["admin", "doctor", "patient"] },
          tenantId: { type: "string", format: "uuid", nullable: true },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "password"],
        properties: {
          token: { type: "string" },
          password: { type: "string", minLength: 8 },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string" },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      ExpenseCategoryCreate: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", maxLength: 100 } },
      },
      ExpenseSubcategoryCreate: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", maxLength: 100 } },
      },
      ExpenseCreate: {
        type: "object",
        required: ["description", "category_id", "subcategory_id", "amount", "expense_date"],
        properties: {
          description: { type: "string", maxLength: 255 },
          category_id: { type: "string", format: "uuid" },
          subcategory_id: { type: "string", format: "uuid" },
          amount: { type: "number", exclusiveMinimum: 0 },
          expense_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          notes: { type: "string", maxLength: 500, nullable: true },
          receipt_url: { type: "string", nullable: true },
        },
      },
      StatementGenerate: {
        type: "object",
        required: ["year", "month"],
        properties: {
          year: { type: "integer", minimum: 2000, maximum: 2100 },
          month: { type: "integer", minimum: 1, maximum: 12 },
        },
      },
      ExternalIncomeCreate: {
        type: "object",
        required: ["source_name", "amount", "income_date"],
        properties: {
          source_name: { type: "string" },
          description: { type: "string", nullable: true },
          amount: { type: "number", exclusiveMinimum: 0 },
          income_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          receipt_url: { type: "string", nullable: true },
        },
      },
      TenantActivePatch: {
        type: "object",
        required: ["isActive"],
        properties: { isActive: { type: "boolean" } },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/register/admin": {
      post: {
        tags: ["Auth"],
        summary: "Register platform admin",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterAdmin" } },
          },
        },
        responses: {
          "201": { description: "Created" },
          "409": { description: "Conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v1/auth/register/doctor": {
      post: {
        tags: ["Auth"],
        summary: "Register doctor (creates clinic tenant)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterDoctor" } },
          },
        },
        responses: {
          "201": { description: "Created" },
          "409": { description: "Conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v1/auth/register/patient": {
      post: {
        tags: ["Auth"],
        summary: "Register patient under a clinic tenant",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterPatient" } },
          },
        },
        responses: {
          "201": { description: "Created" },
          "409": { description: "Conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login (sets HTTP-only cookies)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } },
          },
          "401": { description: "Unauthorized" },
          "429": { description: "Too many attempts / locked" },
        },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh tokens (uses refresh_token cookie)",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (clears cookies)",
        responses: { "204": { description: "No content" } },
      },
    },
    "/api/v1/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ForgotPasswordRequest" } } },
        },
        responses: {
          "200": {
            description: "Always generic message (reset token only in non-production)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    resetToken: { type: "string", description: "Only in development" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with token",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordRequest" } } },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Invalid token" } },
      },
    },
    "/api/v1/auth/password": {
      patch: {
        tags: ["Auth"],
        summary: "Change password (invalidates refresh tokens)",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordRequest" } } },
        },
        responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
      },
    },
    "/api/v1/expense-categories": {
      get: {
        tags: ["Finance"],
        summary: "List expense categories with subcategories",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
        responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } },
      },
      post: {
        tags: ["Finance"],
        summary: "Create expense category",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExpenseCategoryCreate" } } },
        },
        responses: { "201": { description: "Created" }, "409": { description: "Duplicate name" } },
      },
    },
    "/api/v1/expense-categories/{categoryId}": {
      delete: {
        tags: ["Finance"],
        summary: "Delete category (no expenses referencing it)",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "categoryId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Deleted" }, "409": { description: "Has expenses" } },
      },
    },
    "/api/v1/expense-categories/{categoryId}/subcategories": {
      post: {
        tags: ["Finance"],
        summary: "Create subcategory",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "categoryId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExpenseSubcategoryCreate" } } },
        },
        responses: { "201": { description: "Created" }, "409": { description: "Duplicate" } },
      },
    },
    "/api/v1/expense-categories/{categoryId}/subcategories/{subId}": {
      delete: {
        tags: ["Finance"],
        summary: "Delete subcategory",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "categoryId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "subId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Deleted" }, "409": { description: "Has expenses" } },
      },
    },
    "/api/v1/expenses": {
      get: {
        tags: ["Finance"],
        summary: "List expenses with monthly total",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "year", in: "query", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12 } },
          { name: "categoryId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Finance"],
        summary: "Create expense",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExpenseCreate" } } },
        },
        responses: { "201": { description: "Created" }, "400": { description: "Validation" }, "409": { description: "Finalized month" } },
      },
    },
    "/api/v1/expenses/{id}": {
      delete: {
        tags: ["Finance"],
        summary: "Delete expense",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Deleted" }, "404": { description: "Not found" }, "409": { description: "Finalized month" } },
      },
    },
    "/api/v1/statements/generate": {
      post: {
        tags: ["Finance"],
        summary: "Generate or regenerate monthly statement (draft)",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StatementGenerate" } } },
        },
        responses: { "201": { description: "Created" }, "409": { description: "Finalized exists" } },
      },
    },
    "/api/v1/statements": {
      get: {
        tags: ["Finance"],
        summary: "List all statements for tenant",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/v1/statements/{year}/{month}": {
      get: {
        tags: ["Finance"],
        summary: "Statement detail with breakdowns",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "year", in: "path", required: true, schema: { type: "integer" } },
          { name: "month", in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 12 } },
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
    },
    "/api/v1/statements/{id}/finalize": {
      patch: {
        tags: ["Finance"],
        summary: "Finalize statement (irreversible)",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not found" }, "409": { description: "Already finalized" } },
      },
    },
    "/api/v1/external-income": {
      get: {
        tags: ["Finance"],
        summary: "List external income for month",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "year", in: "query", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12 } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Finance"],
        summary: "Add external income",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/TenantHeader" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExternalIncomeCreate" } } },
        },
        responses: { "201": { description: "Created" }, "409": { description: "Finalized month" } },
      },
    },
    "/api/v1/external-income/{id}": {
      delete: {
        tags: ["Finance"],
        summary: "Delete external income",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/TenantHeader" },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Deleted" }, "404": { description: "Not found" }, "409": { description: "Finalized month" } },
      },
    },
    "/api/v1/admin/tenants": {
      get: {
        tags: ["Admin"],
        summary: "List tenants (paginated)",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "skip", in: "query", schema: { type: "integer", default: 0 } },
          { name: "take", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
        ],
        responses: { "200": { description: "OK" }, "403": { description: "Not admin" } },
      },
    },
    "/api/v1/admin/tenants/{id}/active": {
      patch: {
        tags: ["Admin"],
        summary: "Activate or deactivate tenant",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TenantActivePatch" } } },
        },
        responses: { "200": { description: "OK" }, "403": { description: "Not admin" } },
      },
    },
  },
} as const;
