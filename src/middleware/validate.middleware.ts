import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { BadRequestError } from "../domain/errors/AppError.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join("; ");
      return next(new BadRequestError(msg));
    }
    req.body = r.data as unknown as Request["body"];
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join("; ");
      return next(new BadRequestError(msg));
    }
    req.validatedQuery = r.data;
    next();
  };
}
