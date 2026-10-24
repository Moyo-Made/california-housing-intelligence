import { expect, test } from "@playwright/test";

test("home page renders the product framing", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("California Housing Intelligence");
  await expect(
    page.getByRole("heading", { level: 1, name: /1990 California neighbourhood/ }),
  ).toBeVisible();
  await expect(page.getByText("not a current valuation")).toBeVisible();
});
