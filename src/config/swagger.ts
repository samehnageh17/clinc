import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "../docs/openapi.js";

export function setupSwagger(app: Express): void {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Clinic SaaS API",
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
}
