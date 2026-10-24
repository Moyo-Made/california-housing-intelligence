import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/predict", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ predicted_value_usd: 213_456.78 }) }),
  );
  await page.route("**/api/sweep", (route) => route.abort());
});

test("clicking the map moves the area", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toBeVisible();
  const latitude = page.getByRole("textbox", { name: "Latitude" });
  const longitude = page.getByRole("textbox", { name: "Longitude" });

  // Click where the San Francisco landmark dot is drawn.
  const dot = page.getByTestId("location-map").locator("g", { hasText: "San Francisco" }).locator("circle");
  await dot.scrollIntoViewIfNeeded();
  const box = (await dot.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(latitude).toHaveValue(/^37\.7\d$/);
  await expect(longitude).toHaveValue(/^-122\.4\d$/);
  await expect(page.getByText("Constructed inputs.", { exact: true })).toBeVisible();
});

test("arrow keys nudge the pin and the fields follow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toBeVisible();

  await page.getByRole("group", { name: "Location on a map of California" }).focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Shift+ArrowLeft");

  await expect(page.getByRole("textbox", { name: "Latitude" })).toHaveValue("34.31");
  await expect(page.getByRole("textbox", { name: "Longitude" })).toHaveValue("-118.99");
});

test("a point in Nevada is flagged", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Longitude" }).fill("-115.14");
  await page.getByRole("textbox", { name: "Latitude" }).fill("36.17");

  await expect(page.getByText(/outside California or offshore/)).toBeVisible();
  await expect(page.getByTestId("location-pin")).toHaveAttribute("fill", "var(--notice)");
});
