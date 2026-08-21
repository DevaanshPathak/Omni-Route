import { Router } from "express";

import {
  RegistrationRecordResponseSchema,
  RegistrationRecordSchema,
  RegistrationTransferRequestSchema,
  type RegistrationRecord,
} from "@omni-route/shared";

import { sendInvalidRequest, sendNotFound } from "./http.js";
import type { InMemoryRecordStore } from "./store.js";

export function createRegistrationRouter(store: InMemoryRecordStore<RegistrationRecord>): Router {
  const router = Router();

  router.get("/properties/:propertyId", (request, response) => {
    const record = store.get(request.params.propertyId);
    if (record === undefined) {
      return sendNotFound(response, "Registration property was not found.");
    }

    return response.status(200).json(RegistrationRecordResponseSchema.parse({ data: record }));
  });

  router.post("/transfers", (request, response) => {
    const parsed = RegistrationTransferRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendInvalidRequest(response, "Registration transfer", parsed.error);
    }

    const current = store.get(parsed.data.property_id);
    if (current === undefined) {
      return sendNotFound(response, "Registration property was not found.");
    }

    const updated = RegistrationRecordSchema.parse({
      ...current,
      ...parsed.data,
      court_order_ref: parsed.data.document_no,
    });
    store.replace(current.property_id, updated);
    return response.status(200).json(RegistrationRecordResponseSchema.parse({ data: updated }));
  });

  return router;
}
