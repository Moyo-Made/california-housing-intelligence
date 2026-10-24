import { expect, type Route, test } from "@playwright/test";

// The prediction API is mocked at the network layer, so these run without the
// model. `npm run test:contract` covers the real API.
const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

test("shows an estimate and updates it after an edit", async ({ page }) => {
  const bodies: unknown[] = [];
  await page.route("**/api/predict", async (route) => {
    const body = route.request().postDataJSON();
    bodies.push(body);
    await json(route, { predicted_value_usd: body.HouseAge === 45 ? 301_499.99 : 213_456.78 });
  });

  await page.goto("/");
  const value = page.getByTestId("prediction-value");
  await expect(value).toHaveText("$213,000");

  const age = page.getByRole("textbox", { name: "Median house age" });
  await age.fill("45");
  await expect(value).toHaveText("$301,000");
  expect(bodies).toHaveLength(2);
});

test("a slow response for old inputs never replaces a newer estimate", async ({ page }) => {
  let staleRequestAborted = false;
  page.on("requestfailed", (request) => {
    if (request.postDataJSON()?.HouseAge === 40) staleRequestAborted = true;
  });
  await page.route("**/api/predict", async (route) => {
    const { HouseAge } = route.request().postDataJSON();
    if (HouseAge === 40) {
      // Hold this one; changing the inputs again should abort it in the browser.
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await json(route, { predicted_value_usd: 999_000 }).catch(() => {});
      return;
    }
    await json(route, { predicted_value_usd: HouseAge === 10 ? 150_000 : 213_000 });
  });

  await page.goto("/");
  const value = page.getByTestId("prediction-value");
  await expect(value).toHaveText("$213,000");

  const age = page.getByRole("textbox", { name: "Median house age" });
  const slowRequest = page.waitForRequest((r) => r.url().endsWith("/api/predict") && r.postDataJSON().HouseAge === 40);
  await age.fill("40");
  await slowRequest;
  await age.fill("10");

  await expect(value).toHaveText("$150,000");
  await page.waitForTimeout(2_000);
  await expect(value).toHaveText("$150,000");
  expect(staleRequestAborted).toBe(true);
});

test("recovers from an outage with Try again", async ({ page }) => {
  let down = true;
  await page.route("**/api/predict", (route) =>
    down
      ? json(route, { error: { kind: "unavailable", message: "The prediction service isn't reachable right now. Please try again in a moment." } }, 503)
      : json(route, { predicted_value_usd: 213_456.78 }),
  );

  await page.goto("/");
  const card = page.getByRole("region", { name: "Predicted median home value" });
  const retry = card.getByRole("button", { name: "Try again" });
  await expect(retry).toBeVisible();
  await expect(page.getByTestId("prediction-value")).toHaveCount(0);

  down = false;
  await retry.click();
  await expect(page.getByTestId("prediction-value")).toHaveText("$213,000");
  await expect(retry).toHaveCount(0);
});

test("pins a baseline and compares a changed scenario against it", async ({ page }) => {
  await page.route("**/api/predict", async (route) => {
    const { HouseAge } = route.request().postDataJSON();
    await json(route, { predicted_value_usd: HouseAge === 45 ? 258_900 : 213_456.78 });
  });

  await page.goto("/");
  await expect(page.getByTestId("prediction-value")).toHaveText("$213,000");
  await page.getByRole("button", { name: "Pin as baseline" }).click();

  await page.getByRole("textbox", { name: "Median house age" }).fill("45");

  const panel = page.getByRole("region", { name: "Compared with your baseline" });
  await expect(panel.getByText(/estimate is \$46,000 higher than for the baseline/)).toBeVisible();
  await expect(panel.getByRole("listitem")).toHaveText(/Median house age\s*29 years\s*→\s*changed to 45 years/);
  await expect(page.getByTestId("scale-baseline")).toBeVisible();

  await panel.getByRole("button", { name: "Clear baseline" }).click();
  await expect(panel).toHaveCount(0);
});
