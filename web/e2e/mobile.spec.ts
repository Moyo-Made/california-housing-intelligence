import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/predict", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ predicted_value_usd: 213_456.78 }) }),
  );
  await page.route("**/api/sweep", (route) => route.abort());
});

test("keeps the estimate in view while editing, and jumps to the card", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByTestId("mobile-estimate-bar");
  await expect(bar).toHaveAttribute("inert");

  await page.getByRole("textbox", { name: "Population" }).scrollIntoViewIfNeeded();
  await expect(bar).not.toHaveAttribute("inert");
  await expect(bar).toContainText("$213,000");

  await bar.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("region", { name: "Predicted median home value" })).toBeInViewport();
  await expect(bar).toHaveAttribute("inert");
});

test("the bar never shows on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("textbox", { name: "Average bedrooms per household" }).scrollIntoViewIfNeeded();
  await expect(page.getByTestId("mobile-estimate-bar")).toBeHidden();
});
