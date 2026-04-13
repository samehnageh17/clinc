import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../domain/errors/AppError.js";

/** Bookings, staff directory, and schedule management are staff-only (not patient portal). */
export function requireClinicStaff(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role === "patient") {
    return next(new ForbiddenError("Staff only"));
  }
  next();
}
