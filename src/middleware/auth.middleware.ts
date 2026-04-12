import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../domain/errors/AppError.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { verifyAccessToken } from "../infrastructure/security/jwtTokens.js";
import jwt from "jsonwebtoken";

function extractBearer(req: Request): string | undefined {
  const h = req.header("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return undefined;
}

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token ?? extractBearer(req);
    if (!token) throw new UnauthorizedError("Authentication required");
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedError("Invalid session");
    if (user.tokenVersion !== payload.tv) throw new UnauthorizedError("Session invalidated");
    req.auth = payload;
    req.user = { id: user.id, role: user.role };
    next();
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError || e instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError("Invalid or expired token"));
    }
    next(e instanceof UnauthorizedError ? e : new UnauthorizedError());
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token ?? extractBearer(req);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) return next();
    req.auth = payload;
    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    next();
  }
}
