import type { NextFunction, Request, Response } from "express";
import { ClinicDoctorPermission } from "@prisma/client";
import { ForbiddenError } from "../domain/errors/AppError.js";
import { prisma } from "../infrastructure/database/prisma.js";

export async function loadClinicPermissions(req: Request, _res: Response, next: NextFunction) {
  try {
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
    if (!cd) return next(new ForbiddenError("No access to this clinic"));
    if (cd.isOwner) {
      req.permissionSet = "*";
      return next();
    }
    req.permissionSet = new Set(cd.permissions.map((p) => p.permission));
    next();
  } catch (e) {
    next(e);
  }
}

export function requirePermission(permission: ClinicDoctorPermission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const s = req.permissionSet;
    if (s === "*") return next();
    if (s instanceof Set && s.has(permission)) return next();
    return next(new ForbiddenError("Missing permission"));
  };
}
