import { z } from "zod";

export const HealthResponseSchema = z
  .object({
    service: z.literal("omni-route-api"),
    status: z.literal("ok"),
    version: z.string().min(1),
    timestamp: z.iso.datetime(),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
