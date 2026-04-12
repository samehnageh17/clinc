import { Router } from "express";
import type { z } from "zod";
import { env } from "../../../config/env.js";
import { authService } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { validateBody } from "../../../middleware/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.schemas.js";

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function accessCookieOpts() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict" as const,
    maxAge: ACCESS_MS,
    path: "/",
  };
}

function refreshCookieOpts() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict" as const,
    maxAge: REFRESH_MS,
    path: "/",
  };
}

export function authRoutes(): Router {
  const r = Router();

  r.post("/register", validateBody(registerSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof registerSchema>;
      if (body.role === "admin") {
        const out = await authService.registerAdmin({
          fullName: body.fullName,
          email: body.email,
          password: body.password,
          adminSecretKey: body.adminSecretKey,
        });
        return res.status(201).json(out);
      }
      if (body.role === "doctor") {
        const out = await authService.registerDoctor({
          fullName: body.fullName,
          email: body.email,
          password: body.password,
          phone: body.phone,
          clinicName: body.clinicName,
          specialty: body.specialty,
          primaryColor: body.primaryColor,
          secondaryColor: body.secondaryColor,
          logoUrl: body.logoUrl || undefined,
          address: body.address,
          timezone: body.timezone,
          bio: body.bio,
          slug: body.slug,
        });
        return res.status(201).json(out);
      }
      const out = await authService.registerPatient({
        fullName: body.fullName,
        email: body.email,
        password: body.password,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        tenantId: body.tenantId,
      });
      return res.status(201).json(out);
    } catch (e) {
      return next(e);
    }
  });

  r.post("/login", validateBody(loginSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof loginSchema>;
      const out = await authService.login(body);
      res.cookie("access_token", out.accessToken, accessCookieOpts());
      res.cookie("refresh_token", out.refreshToken, refreshCookieOpts());
      res.json({
        userId: out.userId,
        role: out.role,
        tenantId: out.tenantId,
      });
    } catch (e) {
      return next(e);
    }
  });

  r.post("/refresh", async (req, res, next) => {
    try {
      const out = await authService.refresh(req.cookies?.refresh_token);
      res.cookie("access_token", out.accessToken, accessCookieOpts());
      res.cookie("refresh_token", out.refreshToken, refreshCookieOpts());
      res.json({ ok: true });
    } catch (e) {
      return next(e);
    }
  });

  r.post("/logout", async (req, res, next) => {
    try {
      await authService.logout(req.cookies?.refresh_token);
      res.clearCookie("access_token", { path: "/" });
      res.clearCookie("refresh_token", { path: "/" });
      res.status(204).end();
    } catch (e) {
      return next(e);
    }
  });

  r.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof forgotPasswordSchema>;
      const result = await authService.forgotPassword(body.email);
      if (env.NODE_ENV !== "production" && result?.resetToken) {
        return res.json({
          message: "If the email exists, reset instructions were sent.",
          resetToken: result.resetToken,
        });
      }
      res.json({ message: "If the email exists, reset instructions were sent." });
    } catch (e) {
      return next(e);
    }
  });

  r.post("/reset-password", validateBody(resetPasswordSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof resetPasswordSchema>;
      await authService.resetPassword(body.token, body.password);
      res.json({ message: "Password updated" });
    } catch (e) {
      return next(e);
    }
  });

  r.patch("/password", authRequired, validateBody(changePasswordSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof changePasswordSchema>;
      await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
      res.clearCookie("access_token", { path: "/" });
      res.clearCookie("refresh_token", { path: "/" });
      res.json({ message: "Password changed; please sign in again." });
    } catch (e) {
      return next(e);
    }
  });

  return r;
}
