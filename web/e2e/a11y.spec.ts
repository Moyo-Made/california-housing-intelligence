import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route, test } from "@playwright/test";

// Audit settled states: with motion reduced, transitions finish instantly, so axe
// never measures a colour halfway through a fade.
test.use({ reducedMotion: "reduce" });

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function mockApi(page: Page, { down = false } = {}) {
  await page.route("**/api/predict", (route) =>
    down
      ? json(route, { error: { kind: "unavailable", message: "The prediction service isn't reachable right now. Please try again in a moment." } }, 503)
      : json(route, { predicted_value_usd: route.request().postDataJSON().HouseAge === 45 ? 258_900 : 213_456.78 }),
  );
  await page.route("**/api/sweep", (route) => {
    const { input, feature } = route.request().postDataJSON();
    return json(route, {
      feature,
      points: [0.5, 1, 1.5].map((f, i) => ({ value: input[feature] * f, predicted_value_usd: 150_000 + i * 40_000 })),
    });
  });
}

async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  // Readable failure output: rule id and the offending selectors.
  expect(violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
}

test("the default page has no axe violations", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toBeVisible();
  await expect(page.locator(".recharts-line-curve")).toBeVisible();
  await audit(page);
});

test("comparison, warnings and open disclosures have no axe violations", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toBeVisible();
  await page.getByRole("button", { name: "Pin as baseline" }).click();
  await page.getByRole("textbox", { name: "Median house age" }).fill("45");
  await page.getByRole("textbox", { name: "Population" }).fill("50000");
  await expect(page.getByText(/higher than for the baseline/).first()).toBeVisible();
  for (const summary of ["Raw model output", "Show the numbers", "How the tree depth was chosen"]) {
    await page.getByText(summary).click();
  }
  await audit(page);
});

test("error and invalid states have no axe violations", async ({ page }) => {
  await mockApi(page, { down: true });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  const latitude = page.getByRole("textbox", { name: "Latitude" });
  await latitude.fill("99");
  await latitude.blur();
  await expect(latitude).toHaveAttribute("aria-invalid", "true");
  await audit(page);
});

test("the mobile layout with the estimate bar has no axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("textbox", { name: "Population" }).scrollIntoViewIfNeeded();
  const bar = page.getByTestId("mobile-estimate-bar");
  await expect(bar).not.toHaveAttribute("inert");
  // Wait for the estimate, so nothing is mid-way from disabled to enabled.
  await expect(bar).toContainText("$213,000");
  await audit(page);
});

test("an out-of-date estimate after an outage has no axe violations", async ({ page }) => {
  let down = false;
  await page.route("**/api/predict", (route) =>
    down
      ? json(route, { error: { kind: "unavailable", message: "The prediction service isn't reachable right now. Please try again in a moment." } }, 503)
      : json(route, { predicted_value_usd: 213_456.78 }),
  );
  await page.route("**/api/sweep", (route) => {
    if (down) return json(route, { error: { kind: "unavailable", message: "The prediction service isn't reachable right now. Please try again in a moment." } }, 503);
    const { input, feature } = route.request().postDataJSON();
    return json(route, {
      feature,
      points: [0.5, 1, 1.5].map((f, i) => ({ value: input[feature] * f, predicted_value_usd: 150_000 + i * 40_000 })),
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toBeVisible();
  await expect(page.locator(".recharts-line-curve")).toBeVisible();

  down = true;
  await page.getByRole("textbox", { name: "Median house age" }).fill("40");
  for (const region of ["Predicted median home value", "How the model responds"]) {
    await expect(page.getByRole("region", { name: region }).getByText("Out of date", { exact: true })).toBeVisible();
  }
  await audit(page);
});

test("reduced motion switches transitions off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toBeVisible();

  const duration = await page
    .getByTestId("prediction-value")
    .locator("..")
    .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeLessThan(0.001);
});
