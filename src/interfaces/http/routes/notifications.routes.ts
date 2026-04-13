import { Router } from "express";
import { notificationService } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { loadClinicPermissions } from "../../../middleware/permission.middleware.js";
import { resolveTenantContext, requireTenantId } from "../../../middleware/tenant.middleware.js";
import { validateQuery } from "../../../middleware/validate.middleware.js";
import { listNotificationsQuerySchema } from "../schemas/notification.schemas.js";

const chain = [authRequired, resolveTenantContext, requireTenantId, loadClinicPermissions];

export function notificationsRoutes(): Router {
  const r = Router();

  r.get(
    "/notifications",
    ...chain,
    validateQuery(listNotificationsQuerySchema),
    asyncHandler(async (req, res) => {
      const q = req.validatedQuery as { unread_only?: boolean; skip: number; take: number };
      const out = await notificationService.list(req.tenantId!, req.user!.id, {
        unreadOnly: q.unread_only,
        skip: q.skip,
        take: q.take,
      });
      res.json(out);
    })
  );

  r.get(
    "/notifications/unread-count",
    ...chain,
    asyncHandler(async (req, res) => {
      const n = await notificationService.unreadCount(req.tenantId!, req.user!.id);
      res.json({ count: n });
    })
  );

  r.patch(
    "/notifications/:id/read",
    ...chain,
    asyncHandler(async (req, res) => {
      const row = await notificationService.markRead(req.tenantId!, req.user!.id, req.params.id);
      res.json(row);
    })
  );

  r.patch(
    "/notifications/read-all",
    ...chain,
    asyncHandler(async (req, res) => {
      await notificationService.markAllRead(req.tenantId!, req.user!.id);
      res.status(204).end();
    })
  );

  return r;
}
