import { Router } from "express";

import {
  CourtDispatchRequestSchema,
  CourtRecordResponseSchema,
  CourtRecordSchema,
  type CourtRecord,
} from "@omni-route/shared";

import { sendInvalidRequest, sendNotFound } from "./http.js";
import type { InMemoryRecordStore } from "./store.js";

export function createCourtRouter(store: InMemoryRecordStore<CourtRecord>): Router {
  const router = Router();

  router.get("/orders/:orderRef", (request, response) => {
    const record = store.get(request.params.orderRef);
    if (record === undefined) {
      return sendNotFound(response, "Court order was not found.");
    }

    return response.status(200).json(CourtRecordResponseSchema.parse({ data: record }));
  });

  router.post("/orders/:orderRef/dispatch", (request, response) => {
    const parsed = CourtDispatchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendInvalidRequest(response, "Court dispatch", parsed.error);
    }

    const current = store.get(request.params.orderRef);
    if (current === undefined) {
      return sendNotFound(response, "Court order was not found.");
    }

    const updated = CourtRecordSchema.parse({ ...current, ...parsed.data });
    store.replace(current.order_ref, updated);
    return response.status(200).json(CourtRecordResponseSchema.parse({ data: updated }));
  });

  return router;
}
