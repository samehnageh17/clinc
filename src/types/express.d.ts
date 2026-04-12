import type { AccessPayload } from "../infrastructure/security/jwtTokens.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessPayload;
      user?: { id: string; role: string };
      tenantId?: string | null;
      permissionSet?: Set<string> | "*";
      validatedQuery?: unknown;
    }
  }
}

export {};
