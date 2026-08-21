import express, { type Express } from "express";

import { HealthResponseSchema } from "@omni-route/shared";

const API_VERSION = "0.1.0";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    const health = HealthResponseSchema.parse({
      service: "omni-route-api",
      status: "ok",
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    });

    response.status(200).json(health);
  });

  return app;
}
