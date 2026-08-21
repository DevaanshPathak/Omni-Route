import express, { type ErrorRequestHandler, type Express } from "express";

import { ApiErrorResponseSchema, HealthResponseSchema } from "@omni-route/shared";

import { registerCanonicalRuntimeRoutes } from "./canonical-runtime/routes.js";
import { CanonicalRuntimeStore } from "./canonical-runtime/runtime-store.js";
import { PlanningService } from "./interoperability/planning-service.js";
import { loadInteroperabilityRegistry } from "./interoperability/registry.js";
import { registerInteroperabilityRoutes } from "./interoperability/routes.js";
import { registerMockSystemRoutes } from "./mock-systems/routes.js";
import { createMockSystemStores, type MockSystemStores } from "./mock-systems/stores.js";
import { createProviderResolver } from "./understanding/provider-resolver.js";
import { registerUnderstandingRoutes } from "./understanding/routes.js";
import { UnderstandingService, type UnderstandingProvider } from "./understanding/service.js";

const API_VERSION = "0.1.0";

function isMalformedJsonError(error: unknown): error is SyntaxError & { status: 400 } {
  return (
    error instanceof SyntaxError && "status" in error && error.status === 400 && "body" in error
  );
}

const apiErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const malformedJson = isMalformedJsonError(error);
  const status = malformedJson ? 400 : 500;
  const body = ApiErrorResponseSchema.parse({
    error: malformedJson
      ? { code: "INVALID_REQUEST", message: "Request body contained invalid JSON." }
      : { code: "INTERNAL_ERROR", message: "The API could not complete the request." },
  });

  response.status(status).json(body);
};

type AppOptions = {
  stores?: MockSystemStores;
  runtimeStore?: CanonicalRuntimeStore;
  understandingProvider?: UnderstandingProvider;
};

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const stores = options.stores ?? createMockSystemStores();
  const runtimeStore = options.runtimeStore ?? new CanonicalRuntimeStore();
  const providerResolver =
    options.understandingProvider === undefined
      ? createProviderResolver(process.env)
      : () => options.understandingProvider!;
  const understandingService = new UnderstandingService(runtimeStore, providerResolver);
  const planningService = new PlanningService(runtimeStore, stores, loadInteroperabilityRegistry());
  const resetAll = () => {
    planningService.reset();
    runtimeStore.reset();
    stores.reset();
  };

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

  registerMockSystemRoutes(app, stores, resetAll);
  registerCanonicalRuntimeRoutes(app, runtimeStore, resetAll);
  registerUnderstandingRoutes(app, understandingService);
  registerInteroperabilityRoutes(app, planningService);

  app.use((_request, response) => {
    response.status(404).json(
      ApiErrorResponseSchema.parse({
        error: { code: "NOT_FOUND", message: "Route was not found." },
      }),
    );
  });

  app.use(apiErrorHandler);

  return app;
}
