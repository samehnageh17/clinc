import { ClinicDoctorPermission } from "@prisma/client";
import { Router } from "express";
import { patientRepository } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { requireClinicStaff } from "../../../middleware/clinicStaff.middleware.js";
import { loadClinicPermissions, requirePermission } from "../../../middleware/permission.middleware.js";
import { resolveTenantContext, requireTenantId } from "../../../middleware/tenant.middleware.js";
import { validateBody, validateQuery } from "../../../middleware/validate.middleware.js";
import { listPatientsQuerySchema, patientNotesSchema } from "../schemas/patient.schemas.js";

const chain = [authRequired, resolveTenantContext, requireTenantId, loadClinicPermissions, requireClinicStaff];

export function patientsRoutes(): Router {
  const r = Router();

  r.get(
    "/patients",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_patients),
    validateQuery(listPatientsQuerySchema),
    asyncHandler(async (req, res) => {
      const q = req.validatedQuery as { search?: string; skip: number; take: number };
      const out = await patientRepository.listByTenant(req.tenantId!, {
        search: q.search,
        skip: q.skip,
        take: q.take,
      });
      res.json(out);
    })
  );

  r.patch(
    "/patients/:id/notes",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_patients),
    validateBody(patientNotesSchema),
    asyncHandler(async (req, res) => {
      const { notes } = req.body as { notes: string | null };
      const row = await patientRepository.updateNotes(req.tenantId!, req.params.id, notes);
      res.json(row);
    })
  );

  return r;
}
