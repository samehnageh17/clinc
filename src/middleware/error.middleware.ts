import type { NextFunction, Request, Response } from "express";
import { AppError } from "../domain/errors/AppError.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }
  logger.error("unhandled_error", {
    message: err instanceof Error ? err.message : String(err),
    stack: env.NODE_ENV === "production" ? undefined : err instanceof Error ? err.stack : undefined,
  });
  const body: { error: string; stack?: string } = {
    error: "Internal server error",
  };
  if (env.NODE_ENV !== "production" && err instanceof Error) {
    body.stack = err.stack;
  }
  return res.status(500).json(body);
}
