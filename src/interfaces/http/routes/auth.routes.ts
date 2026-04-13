import { Router } from "express";
import type { z } from "zod";
import { env } from "../../../config/env.js";
import { authService } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { validateBody } from "../../../middleware/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerAdminSchema,
  registerDoctorSchema,
  registerPatientSchema,
  resetPasswordSchema,
} from "../schemas/auth.schemas.js";

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function accessCookieOpts() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax" as const,
    maxAge: ACCESS_MS,
    path: "/",
  };
}

function refreshCookieOpts() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax" as const,
    maxAge: REFRESH_MS,
    path: "/",
  };
}

export function authRoutes(): Router {
  const r = Router();

  r.post(
    "/register/admin",
    validateBody(registerAdminSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof registerAdminSchema>;
      const out = await authService.registerAdmin({
        fullName: body.fullName,
        email: body.email,
        password: body.password,
        adminSecretKey: body.adminSecretKey,
      });
      res.status(201).json(out);
    }),
  );

  r.post(
    "/register/doctor",
    validateBody(registerDoctorSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof registerDoctorSchema>;
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
      res.status(201).json(out);
    }),
  );

  r.post(
    "/register/patient",
    validateBody(registerPatientSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof registerPatientSchema>;
      const out = await authService.registerPatient({
        fullName: body.fullName,
        email: body.email,
        password: body.password,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        tenantId: body.tenantId,
      });
      res.status(201).json(out);
    }),
  );

  r.post(
    "/login",
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof loginSchema>;
      const out = await authService.login(body);
      res.cookie("access_token", out.accessToken, accessCookieOpts());
      res.cookie("refresh_token", out.refreshToken, refreshCookieOpts());
      res.json({
        userId: out.userId,
        role: out.role,
        tenantId: out.tenantId,
      });
    }),
  );

  r.post(
    "/refresh",
    asyncHandler(async (req, res) => {
      const out = await authService.refresh(req.cookies?.refresh_token);
      res.cookie("access_token", out.accessToken, accessCookieOpts());
      res.cookie("refresh_token", out.refreshToken, refreshCookieOpts());
      res.json({ ok: true });
    }),
  );

  r.post(
    "/logout",
    asyncHandler(async (req, res) => {
      await authService.logout(req.cookies?.refresh_token);
      res.clearCookie("access_token", { path: "/" });
      res.clearCookie("refresh_token", { path: "/" });
      res.status(204).end();
    }),
  );

  r.post(
    "/forgot-password",
    validateBody(forgotPasswordSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof forgotPasswordSchema>;
      const result = await authService.forgotPassword(body.email);
      if (env.NODE_ENV !== "production" && result?.resetToken) {
        res.json({
          message: "If the email exists, reset instructions were sent.",
          resetToken: result.resetToken,
        });
        return;
      }
      res.json({
        message: "If the email exists, reset instructions were sent.",
      });
    }),
  );

  r.post(
    "/reset-password",
    validateBody(resetPasswordSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof resetPasswordSchema>;
      await authService.resetPassword(body.token, body.password);
      res.json({ message: "Password updated" });
    }),
  );

  r.patch(
    "/password",
    authRequired,
    validateBody(changePasswordSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as z.infer<typeof changePasswordSchema>;
      await authService.changePassword(
        req.user!.id,
        body.currentPassword,
        body.newPassword,
      );
      res.clearCookie("access_token", { path: "/" });
      res.clearCookie("refresh_token", { path: "/" });
      res.json({ message: "Password changed; please sign in again." });
    }),
  );

  return r;
}
