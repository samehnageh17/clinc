import { Router } from "express";
import { repos } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { requireRoles } from "../../../middleware/role.middleware.js";

export function adminRoutes(): Router {
  const r = Router();

  r.get("/tenants", authRequired, requireRoles("admin"), async (req, res, next) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const skip = Math.max(0, Number(req.query.skip) || 0);
      const take = Math.min(100, Math.max(1, Number(req.query.take) || 50));
      const result = await repos.tenants.list({ search, skip, take });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  r.patch("/tenants/:id/active", authRequired, requireRoles("admin"), async (req, res, next) => {
    try {
      const isActive = Boolean(req.body?.isActive);
      const tenant = await repos.tenants.setActive(req.params.id, isActive);
      res.json(tenant);
    } catch (e) {
      next(e);
    }
  });

  return r;
}
