import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type ScenarioFixture = {
  scenario: string;
  revenue: { survey_no: string };
};

async function readScenario(filename: string): Promise<ScenarioFixture> {
  const path = fileURLToPath(new URL(`../../../fixtures/scenarios/${filename}`, import.meta.url));
  return JSON.parse(await readFile(path, "utf8")) as ScenarioFixture;
}

describe("scenario fixtures", () => {
  it("keeps the conflict survey identifier distinct from the happy path", async () => {
    const happy = await readScenario("property-transfer.happy.json");
    const conflict = await readScenario("property-transfer.conflict.json");

    expect(happy.scenario).toBe("happy-path");
    expect(conflict.scenario).toBe("conflicting-property");
    expect(happy.revenue.survey_no).toBe("45/2");
    expect(conflict.revenue.survey_no).toBe("45/3");
    expect(conflict.revenue.survey_no).not.toBe(happy.revenue.survey_no);
  });
});
