import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../domain/errors/AppError.js";

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}
