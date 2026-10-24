import { expect, type Route, test } from "@playwright/test";

const json = (route: Route, body: unknown) =>
  route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/predict", (route) => json(route, { predicted_value_usd: 213_456.78 }));
});

test("draws the model's response and switches the input it varies", async ({ page }) => {
  const features: string[] = [];
  await page.route("**/api/sweep", (route) => {
    const { input, feature } = route.request().postDataJSON();
    features.push(feature);
    const current = input[feature];
    const values = [current * 0.5, current, current * 1.5];
    return json(route, {
      feature,
      points: values.map((value, i) => ({ value, predicted_value_usd: 150_000 + i * 50_000 })),
    });
  });

  await page.goto("/");
  const section = page.getByRole("region", { name: "How the model responds" });
  await expect(section.locator(".recharts-line-curve")).toBeVisible();
  await expect(section.getByText("Current value: $35,348 a year")).toBeVisible();

  await section.getByRole("combobox", { name: "Input to vary" }).click();
  await page.getByRole("option", { name: "Median house age" }).click();
  await expect(section.getByText("Current value: 29 years")).toBeVisible();
  expect(features).toEqual(["MedInc", "HouseAge"]);

  await section.getByText("Show the numbers").click();
  await expect(section.getByRole("row", { name: /29 years \(current\)/ })).toContainText("$200,000");
});

test("asks again only after the inputs settle", async ({ page }) => {
  let sweeps = 0;
  await page.route("**/api/sweep", (route) => {
    sweeps += 1;
    const { feature } = route.request().postDataJSON();
    return json(route, { feature, points: [{ value: 1, predicted_value_usd: 200_000 }, { value: 2, predicted_value_usd: 210_000 }] });
  });

  await page.goto("/");
  const section = page.getByRole("region", { name: "How the model responds" });
  await expect(section.locator(".recharts-line-curve")).toBeVisible();

  const population = page.getByRole("textbox", { name: "Population" });
  await population.click();
  await population.press("ControlOrMeta+a");
  await population.pressSequentially("2500", { delay: 50 });
  await page.waitForTimeout(1_000);

  expect(sweeps).toBe(2);
});
