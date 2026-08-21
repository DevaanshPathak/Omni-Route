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
  await expect(page.getByText("Approved field mappings", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Append-only audit timeline", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo state reset" })).toBeVisible();
});
