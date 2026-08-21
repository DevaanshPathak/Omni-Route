import type { CourtRecord, RegistrationRecord, RevenueRecord } from "@omni-route/shared";

import { loadSeedBundle, type SeedBundle } from "./seed-loader.js";
import { InMemoryRecordStore } from "./store.js";

export type MockSystemStores = {
  court: InMemoryRecordStore<CourtRecord>;
  registration: InMemoryRecordStore<RegistrationRecord>;
  revenue: InMemoryRecordStore<RevenueRecord>;
  reset: () => void;
};

export function createMockSystemStores(seeds: SeedBundle = loadSeedBundle()): MockSystemStores {
  const court = new InMemoryRecordStore(seeds.court, (record) => record.order_ref);
  const registration = new InMemoryRecordStore(seeds.registration, (record) => record.property_id);
  const revenue = new InMemoryRecordStore(seeds.revenue, (record) => record.survey_no);

  return {
    court,
    registration,
    revenue,
    reset: () => {
      court.reset();
      registration.reset();
      revenue.reset();
    },
  };
}
