import { ClinicDoctorPermission } from "@prisma/client";
import { Router } from "express";
import type { ClinicDoctorPermission as Perm } from "../../../domain/repositories/IClinicDoctorRepository.js";
import { staffService } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { requireClinicStaff } from "../../../middleware/clinicStaff.middleware.js";
import { loadClinicPermissions, requirePermission } from "../../../middleware/permission.middleware.js";
import { resolveTenantContext, requireTenantId } from "../../../middleware/tenant.middleware.js";
import { validateBody } from "../../../middleware/validate.middleware.js";
import { staffInviteSchema, staffPermissionsSchema } from "../schemas/staff.schemas.js";

const chain = [authRequired, resolveTenantContext, requireTenantId, loadClinicPermissions, requireClinicStaff];

export function staffRoutes(): Router {
  const r = Router();

  r.get(
    "/staff",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_appointments),
    asyncHandler(async (req, res) => {
      const rows = await staffService.list(req.tenantId!);
      res.json(rows);
    })
  );

  r.post(
    "/staff/invite",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_staff),
    validateBody(staffInviteSchema),
    asyncHandler(async (req, res) => {
      const b = req.body as {
        full_name: string;
        email: string;
        password?: string;
        phone?: string | null;
        specialty?: string | null;
        fee_per_session?: number;
        session_duration_min?: number;
        permissions?: Perm[];
      };
      const row = await staffService.inviteDoctor(req.tenantId!, {
        fullName: b.full_name,
        email: b.email,
        password: b.password,
        phone: b.phone,
        specialty: b.specialty,
        feePerSession: b.fee_per_session,
        sessionDurationMin: b.session_duration_min,
        permissions: b.permissions,
      });
      res.status(201).json(row);
    })
  );

  r.patch(
    "/staff/:clinicDoctorId/permissions",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_staff),
    validateBody(staffPermissionsSchema),
    asyncHandler(async (req, res) => {
      const { permissions } = req.body as { permissions: Perm[] };
      await staffService.setPermissions(req.tenantId!, req.user!.id, req.params.clinicDoctorId, permissions);
      res.status(204).end();
    })
  );

  r.delete(
    "/staff/:clinicDoctorId",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_staff),
    asyncHandler(async (req, res) => {
      await staffService.deactivate(req.tenantId!, req.params.clinicDoctorId);
      res.status(204).end();
    })
  );

  return r;
}
