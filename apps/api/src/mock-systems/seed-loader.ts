import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CourtRecordSchema,
  RegistrationRecordSchema,
  RevenueRecordSchema,
  type CourtRecord,
  type RegistrationRecord,
  type RevenueRecord,
} from "@omni-route/shared";
import { z } from "zod";

const CourtSeedFileSchema = z
  .object({
    schema_version: z.literal("court.v1"),
    records: z.array(CourtRecordSchema).min(1),
  })
  .strict();

const RegistrationSeedFileSchema = z
  .object({
    schema_version: z.literal("registration.v1"),
    records: z.array(RegistrationRecordSchema).min(1),
  })
  .strict();

const RevenueSeedFileSchema = z
  .object({
    schema_version: z.literal("revenue.v1"),
    records: z.array(RevenueRecordSchema).min(1),
  })
  .strict();

export type SeedBundle = {
  court: CourtRecord[];
  registration: RegistrationRecord[];
  revenue: RevenueRecord[];
};

const defaultSeedDirectory = fileURLToPath(new URL("../../../../data/seeds/", import.meta.url));

function readJson(filename: string, seedDirectory: string): unknown {
  return JSON.parse(readFileSync(join(seedDirectory, filename), "utf8"));
}

export function loadSeedBundle(seedDirectory = defaultSeedDirectory): SeedBundle {
  return {
    court: CourtSeedFileSchema.parse(readJson("court.records.v1.json", seedDirectory)).records,
    registration: RegistrationSeedFileSchema.parse(
      readJson("registration.records.v1.json", seedDirectory),
    ).records,
    revenue: RevenueSeedFileSchema.parse(readJson("revenue.records.v1.json", seedDirectory))
      .records,
  };
}
