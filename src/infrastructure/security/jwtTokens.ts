import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface AccessPayload {
  sub: string;
  role: string;
  tenantId: string | null;
  tv: number;
}

export function signAccessToken(payload: AccessPayload): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "clinic-saas",
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "clinic-saas" });
  if (typeof decoded !== "object" || decoded === null) throw new Error("Invalid token");
  const d = decoded as Record<string, unknown>;
  return {
    sub: String(d.sub),
    role: String(d.role),
    tenantId: d.tenantId == null ? null : String(d.tenantId),
    tv: Number(d.tv),
  };
}
