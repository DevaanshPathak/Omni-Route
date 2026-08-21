import { expect, test } from "@playwright/test";

test("a citizen completes the deterministic ownership workflow and opens its trace", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo state reset" })).toBeVisible();

  await page.getByRole("button", { name: "Complete ownership workflow" }).click();

  await expect(
    page.getByRole("heading", { name: "Ownership transfer workflow completed" }),
  ).toBeVisible();
  await expect(page.getByText(/Workflow ID WRK-/)).toBeVisible();
  await expect(
    page.locator(".phase-six-systems .system-card-heading").getByText("VERIFIED"),
  ).toHaveCount(3);

  await page.getByText("Open technical trace").click();
  await expect(page.getByText("Semantic Action Graph", { exact: true })).toBeVisible();
  await expect(page.getByText("Field mappings and candidates", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Append-only audit timeline", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo state reset" })).toBeVisible();
});

test("Revenue schema drift blocks all actions and leaves every record unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo state reset" })).toBeVisible();
  await page.getByRole("radio", { name: /Revenue schema drift/ }).check();
  await expect(
    page.getByRole("status").filter({ hasText: "Revenue schema drift enabled" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Complete ownership workflow" }).click();

  await expect(page.getByRole("heading", { name: "Records require human review" })).toBeVisible();
  await expect(
    page.locator(".phase-six-systems .system-card-heading").getByText("NOT_STARTED"),
  ).toHaveCount(3);
  await expect(page.locator(".phase-six-systems").getByText("Anita Rao")).toHaveCount(2);
  await expect(page.locator(".phase-six-systems").getByText("ISSUED")).toBeVisible();

  await page.getByText("Open technical trace").click();
  const conflict = page
    .getByRole("alert", { name: "" })
    .filter({ hasText: "Revenue schema mismatch detected" });
  await expect(conflict.getByText("owner_nm", { exact: true })).toBeVisible();
  await expect(conflict.getByText("registered_owner", { exact: true })).toBeVisible();
  await expect(conflict.getByText("61%", { exact: true })).toBeVisible();
  await expect(conflict.getByText("90%", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Aggregate preflight failed; no adapters were called."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo state reset" })).toBeVisible();
});
