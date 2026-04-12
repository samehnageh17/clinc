import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../domain/errors/AppError.js";

export function resolveTenantContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    req.tenantId = undefined;
    return next();
  }
  const header = req.header("x-tenant-id") ?? undefined;
  if (req.auth.role === "admin") {
    req.tenantId = header ?? null;
    return next();
  }
  if (req.auth.role === "patient") {
    const tid = req.auth.tenantId;
    if (header && tid && header !== tid) return next(new ForbiddenError("Tenant mismatch"));
    req.tenantId = tid ?? header ?? null;
    return next();
  }
  if (req.auth.role === "doctor") {
    req.tenantId = header ?? req.auth.tenantId;
    return next();
  }
  req.tenantId = req.auth.tenantId;
  next();
}

export function requireTenantId(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return next(new ForbiddenError("Tenant context required"));
  }
  next();
}
