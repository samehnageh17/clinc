import type { NextFunction, Request, Response } from "express";
import { ClinicDoctorPermission } from "@prisma/client";
import { ForbiddenError } from "../domain/errors/AppError.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { asyncHandler } from "./asyncHandler.js";

export const loadClinicPermissions = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.tenantId == null || req.tenantId === "") {
      req.permissionSet = undefined;
      return next();
    }
    const tenantId = req.tenantId as string;
    if (req.user.role === "admin") {
      req.permissionSet = "*";
      return next();
    }
    if (req.user.role === "patient") {
      req.permissionSet = new Set();
      return next();
    }
    const cd = await prisma.clinicDoctor.findFirst({
      where: { tenantId, userId: req.user.id, isActive: true },
      include: { permissions: true },
    });
    if (!cd) throw new ForbiddenError("No access to this clinic");
    if (cd.isOwner) {
      req.permissionSet = "*";
      return next();
    }
    req.permissionSet = new Set(cd.permissions.map((p) => p.permission));
    next();
});

export function requirePermission(permission: ClinicDoctorPermission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const s = req.permissionSet;
    if (s === "*") return next();
    if (s instanceof Set && s.has(permission)) return next();
    return next(new ForbiddenError("Missing permission"));
  };
}
