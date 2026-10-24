import { expect, test } from "@playwright/test";

test("home page renders the product framing", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("California Housing Intelligence");
  await expect(
    page.getByRole("heading", { level: 1, name: /1990 California neighbourhood/ }),
  ).toBeVisible();
  await expect(page.getByText("not a current valuation")).toBeVisible();
});

test("the header link scrolls to the method section", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Method and limits" }).click();

  await expect(page).toHaveURL(/#method$/);
  await expect(page.getByRole("heading", { level: 2, name: "Method and limits" })).toBeInViewport();
});
