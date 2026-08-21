import { Router } from "express";

import {
  RevenueMutationRequestSchema,
  RevenueRecordResponseSchema,
  RevenueRecordSchema,
  type RevenueRecord,
} from "@omni-route/shared";

import { sendInvalidRequest, sendNotFound } from "./http.js";
import type { InMemoryRecordStore } from "./store.js";

export function createRevenueRouter(store: InMemoryRecordStore<RevenueRecord>): Router {
  const router = Router();

  router.get("/properties/:surveyNo", (request, response) => {
    const record = store.get(request.params.surveyNo);
    if (record === undefined) {
      return sendNotFound(response, "Revenue property was not found.");
    }

    return response.status(200).json(RevenueRecordResponseSchema.parse({ data: record }));
  });

  router.post("/mutations", (request, response) => {
    const parsed = RevenueMutationRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendInvalidRequest(response, "Revenue mutation", parsed.error);
    }

    const current = store.get(parsed.data.survey_no);
    if (current === undefined) {
      return sendNotFound(response, "Revenue property was not found.");
    }

    const updated = RevenueRecordSchema.parse({ ...current, ...parsed.data });
    store.replace(current.survey_no, updated);
    return response.status(200).json(RevenueRecordResponseSchema.parse({ data: updated }));
  });

  return router;
}
