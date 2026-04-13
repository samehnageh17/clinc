import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "../../config/env.js";
import { setupSwagger } from "../../config/swagger.js";
import { errorHandler } from "../../middleware/error.middleware.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { financeRoutes } from "./routes/finance.routes.js";
import { notificationsRoutes } from "./routes/notifications.routes.js";
import { patientsRoutes } from "./routes/patients.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { scheduleRoutes } from "./routes/schedule.routes.js";
import { staffRoutes } from "./routes/staff.routes.js";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/api-docs") || req.path === "/openapi.json",
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  // Swagger UI requires inline scripts; disable CSP for API server (JSON-only otherwise).
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(globalLimiter);
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  setupSwagger(app);

  app.use("/api/v1/public", publicLimiter, publicRoutes());
  app.use("/api/v1/auth", authLimiter, authRoutes());
  app.use("/api/v1", financeRoutes());
  app.use("/api/v1", scheduleRoutes());
  app.use("/api/v1", notificationsRoutes());
  app.use("/api/v1", staffRoutes());
  app.use("/api/v1", patientsRoutes());
  app.use("/api/v1/admin", adminRoutes());

  app.use(errorHandler);
  return app;
}
